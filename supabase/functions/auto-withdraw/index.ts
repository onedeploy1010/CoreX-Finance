/**
 * Auto-withdraw Edge Function
 *
 * Processes approved withdrawals by calling the CoreXWithdrawal contract on BSC.
 * Uses operator private key stored in Supabase secrets.
 *
 * Env vars required:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WITHDRAWAL_PRIVATE_KEY - operator wallet private key
 *   BSC_RPC_URL - (optional, defaults to public BSC RPC)
 *
 * Can be triggered by:
 *   - pg_cron scheduled job
 *   - Manual call from admin UI
 *   - Database webhook on withdrawal approval
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.13.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PRIVATE_KEY = Deno.env.get("WITHDRAWAL_PRIVATE_KEY")!;
const BSC_RPC = Deno.env.get("BSC_RPC_URL") || "https://bsc-dataseed1.binance.org";

const WITHDRAWAL_CONTRACT = "0xA25c9C1dE6DA0CE04D06A27eB2779d6BAfAe9236";

const WITHDRAWAL_ABI = [
  "function batchWithdraw(bytes32 _batchId, address[] calldata _recipients, uint256[] calldata _amounts) external",
  "function getContractBalance() external view returns (uint256)",
  "function isBatchProcessed(bytes32 _batchId) external view returns (bool)",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseUSDT(amount: string): bigint {
  const parts = amount.split(".");
  const whole = parts[0] || "0";
  const decimal = (parts[1] || "").padEnd(18, "0").slice(0, 18);
  return BigInt(whole + decimal);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ success: false, message: "WITHDRAWAL_PRIVATE_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Get approved withdrawals ready for processing
    const { data: withdrawals, error: fetchError } = await supabase.rpc(
      "get_approved_withdrawals_for_processing",
      { p_limit: 50 }
    );

    if (fetchError) {
      return new Response(
        JSON.stringify({ success: false, message: "Failed to fetch withdrawals: " + fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pending = withdrawals || [];
    if (pending.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No pending withdrawals", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Setup ethers provider and wallet
    const provider = new ethers.JsonRpcProvider(BSC_RPC, {
      name: "bsc",
      chainId: 56,
    });
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(WITHDRAWAL_CONTRACT, WITHDRAWAL_ABI, wallet);

    // 3. Check contract balance
    const balance = await contract.getContractBalance();
    const totalNeeded = pending.reduce(
      (sum: bigint, w: any) => sum + parseUSDT(w.amount.toString()),
      0n
    );

    if (balance < totalNeeded) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Insufficient contract balance. Need ${ethers.formatUnits(totalNeeded, 18)} USDT, have ${ethers.formatUnits(balance, 18)} USDT`,
          balance: ethers.formatUnits(balance, 18),
          needed: ethers.formatUnits(totalNeeded, 18),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Prepare batch data
    const recipients = pending.map((w: any) => w.wallet_address);
    const amounts = pending.map((w: any) => parseUSDT(w.amount.toString()));
    const ids = pending.map((w: any) => w.id);

    // 5. Generate batch ID
    const batchData = new TextEncoder().encode(Date.now().toString() + JSON.stringify(ids));
    const hashBuffer = await crypto.subtle.digest("SHA-256", batchData);
    const batchId = "0x" + Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    const batchIdBytes32 = batchId.slice(0, 66);

    // 6. Check if batch already processed
    const alreadyProcessed = await contract.isBatchProcessed(batchIdBytes32);
    if (alreadyProcessed) {
      return new Response(
        JSON.stringify({ success: false, message: "Batch ID collision, retry" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Send transaction
    const tx = await contract.batchWithdraw(batchIdBytes32, recipients, amounts);
    const receipt = await tx.wait();
    const txHash = receipt.hash;

    // 8. Update database
    const { error: updateError } = await supabase.rpc("mark_withdrawals_processed", {
      p_ids: ids,
      p_batch_id: batchIdBytes32,
      p_tx_hash: txHash,
    });

    if (updateError) {
      // Transaction succeeded but DB update failed - log for manual recovery
      console.error("TX succeeded but DB update failed!", {
        txHash,
        batchId: batchIdBytes32,
        ids,
        error: updateError.message,
      });
      return new Response(
        JSON.stringify({
          success: true,
          warning: "Transaction sent but DB update failed - manual intervention needed",
          txHash,
          batchId: batchIdBytes32,
          ids,
        }),
        { status: 207, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Log the action
    await supabase.from("admin_logs").insert({
      admin_id: 0,
      admin_username: "system",
      admin_role: "system",
      action: "自动批量提现上链",
      target_type: "withdrawal_batch",
      target_id: batchIdBytes32,
      detail: JSON.stringify({
        count: ids.length,
        txHash,
        totalAmount: ethers.formatUnits(totalNeeded, 18),
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        txHash,
        batchId: batchIdBytes32,
        processed: ids.length,
        totalAmount: ethers.formatUnits(totalNeeded, 18),
        bscscanUrl: `https://bscscan.com/tx/${txHash}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Auto-withdraw error:", err);
    return new Response(
      JSON.stringify({ success: false, message: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
