/**
 * Auto-withdraw Edge Function
 *
 * Processes approved withdrawals by calling the CoreXWithdrawal contract on BSC.
 * Auto-funds the contract from operator wallet when contract balance is insufficient.
 * Notifies admin when operator wallet is also insufficient.
 *
 * Env vars required:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WITHDRAWAL_PRIVATE_KEY - operator wallet private key
 *   BSC_RPC_URL - (optional, defaults to public BSC RPC)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.13.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PRIVATE_KEY = Deno.env.get("WITHDRAWAL_PRIVATE_KEY")!;
const BSC_RPC = Deno.env.get("BSC_RPC_URL") || "https://bsc-dataseed1.binance.org";

const WITHDRAWAL_CONTRACT = "0xA25c9C1dE6DA0CE04D06A27eB2779d6BAfAe9236";
const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";

const WITHDRAWAL_ABI = [
  "function batchWithdraw(bytes32 _batchId, address[] calldata _recipients, uint256[] calldata _amounts) external",
  "function getContractBalance() external view returns (uint256)",
  "function isBatchProcessed(bytes32 _batchId) external view returns (bool)",
  "function pullFunds(uint256 amount) external",
  "function fundingWallet() external view returns (address)",
];

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
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

    // Parse request body for manual trigger flag
    let isManual = false;
    try {
      const body = await req.json();
      isManual = body?.manual === true;
    } catch { /* empty body is fine */ }

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

    // 1.5 Check auto-execute minimum batch amount (skip if manual trigger)
    if (!isManual) {
      const { data: execMinRow } = await supabase
        .from("system_settings").select("value").eq("key", "auto_withdraw_exec_min").single();
      const execMin = parseFloat(execMinRow?.value || "0");

      if (execMin > 0) {
        const totalPendingAmount = pending.reduce(
          (sum: number, w: any) => sum + parseFloat(w.amount.toString()), 0
        );
        if (totalPendingAmount < execMin) {
          return new Response(
            JSON.stringify({
              success: true,
              message: `待提现总额 ${totalPendingAmount.toFixed(2)} USDT 未达到自动执行最低额度 ${execMin} USDT`,
              processed: 0,
              totalPending: totalPendingAmount,
              execMin,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 2. Setup ethers provider and wallet
    const provider = new ethers.JsonRpcProvider(BSC_RPC, {
      name: "bsc",
      chainId: 56,
    });
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(WITHDRAWAL_CONTRACT, WITHDRAWAL_ABI, wallet);
    const usdtContract = new ethers.Contract(USDT_BSC, ERC20_ABI, wallet);

    // 3. Check contract balance
    const contractBalance = await contract.getContractBalance();
    const totalNeeded = pending.reduce(
      (sum: bigint, w: any) => sum + parseUSDT(w.amount.toString()),
      0n
    );

    // 3.5 Read contract minimum balance threshold
    const { data: minBalRow } = await supabase
      .from("system_settings").select("value").eq("key", "withdrawal_contract_min_balance").single();
    const contractMinBalance = parseUSDT(minBalRow?.value || "0");

    let funded = false;
    let fundTxHash = "";

    // 4. If contract balance insufficient (or would drop below min threshold), try to auto-fund via pullFunds
    const targetBalance = totalNeeded + contractMinBalance; // ensure min balance remains after withdrawal
    if (contractBalance < targetBalance) {
      const deficit = targetBalance - contractBalance;

      // Check if funding wallet is configured in contract
      let fundingWalletAddr: string;
      try {
        fundingWalletAddr = await contract.fundingWallet();
      } catch {
        fundingWalletAddr = ethers.ZeroAddress;
      }

      if (fundingWalletAddr && fundingWalletAddr !== ethers.ZeroAddress) {
        // Check funding wallet's USDT balance and allowance
        const walletUSDTBalance = await usdtContract.balanceOf(fundingWalletAddr);
        const allowance = await usdtContract.allowance(fundingWalletAddr, WITHDRAWAL_CONTRACT);

        if (walletUSDTBalance >= deficit && allowance >= deficit) {
          // Pull USDT from funding wallet via contract (no private key needed for funding wallet)
          console.log(`Auto-pulling from funding wallet: deficit=${ethers.formatUnits(deficit, 18)} USDT`);

          const pullTx = await contract.pullFunds(deficit);
          const pullReceipt = await pullTx.wait();
          fundTxHash = pullReceipt.hash;
          funded = true;

          console.log(`Pulled ${ethers.formatUnits(deficit, 18)} USDT, tx: ${fundTxHash}`);

          // Log the auto-funding action
          await supabase.from("admin_logs").insert({
            admin_id: 0,
            admin_username: "system",
            admin_role: "system",
            action: "自动从提现钱包拉取资金",
            target_type: "withdrawal_contract",
            target_id: WITHDRAWAL_CONTRACT,
            detail: JSON.stringify({
              fundingWallet: fundingWalletAddr,
              deficit: ethers.formatUnits(deficit, 18),
              txHash: fundTxHash,
              walletBalance: ethers.formatUnits(walletUSDTBalance, 18),
            }),
          });
        } else {
          // Funding wallet insufficient or not enough allowance
          const walletBalanceFormatted = ethers.formatUnits(walletUSDTBalance, 18);
          const allowanceFormatted = ethers.formatUnits(allowance, 18);
          const contractBalanceFormatted = ethers.formatUnits(contractBalance, 18);
          const totalNeededFormatted = ethers.formatUnits(totalNeeded, 18);

          const reason = allowance < deficit
            ? `授权不足 (已授权: ${allowanceFormatted} USDT)，请在后台重新授权`
            : `钱包余额不足 (余额: ${walletBalanceFormatted} USDT)`;

          await supabase.from("admin_notifications").insert({
            type: "insufficient_funds",
            title: "提现资金不足",
            message: `${reason}。提现合约余额: ${contractBalanceFormatted} USDT, 需要: ${totalNeededFormatted} USDT。`,
            is_read: false,
          });

          await supabase.from("admin_logs").insert({
            admin_id: 0,
            admin_username: "system",
            admin_role: "system",
            action: "提现资金不足警告",
            target_type: "withdrawal_contract",
            target_id: WITHDRAWAL_CONTRACT,
            detail: JSON.stringify({
              contractBalance: contractBalanceFormatted,
              walletBalance: walletBalanceFormatted,
              allowance: allowanceFormatted,
              totalNeeded: totalNeededFormatted,
              pendingCount: pending.length,
            }),
          });

          return new Response(
            JSON.stringify({
              success: false,
              message: `资金不足：${reason}，已通知管理员`,
              contractBalance: contractBalanceFormatted,
              walletBalance: walletBalanceFormatted,
              needed: totalNeededFormatted,
              pendingCount: pending.length,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Fallback: if pullFunds failed or no funding wallet, try direct deposit from operator wallet
      if (!funded) {
        const operatorUSDTBalance = await usdtContract.balanceOf(wallet.address);
        if (operatorUSDTBalance >= deficit) {
          console.log(`Fallback: depositing from operator wallet, deficit=${ethers.formatUnits(deficit, 18)} USDT`);

          // Approve if needed
          const opAllowance = await usdtContract.allowance(wallet.address, WITHDRAWAL_CONTRACT);
          if (opAllowance < deficit) {
            const approveTx = await (new ethers.Contract(USDT_BSC, ["function approve(address,uint256) returns (bool)"], wallet)).approve(WITHDRAWAL_CONTRACT, ethers.MaxUint256);
            await approveTx.wait();
          }

          const depositContract = new ethers.Contract(WITHDRAWAL_CONTRACT, ["function deposit(uint256) external"], wallet);
          const depositTx = await depositContract.deposit(deficit);
          const depositReceipt = await depositTx.wait();
          fundTxHash = depositReceipt.hash;
          funded = true;

          await supabase.from("admin_logs").insert({
            admin_id: 0,
            admin_username: "system",
            admin_role: "system",
            action: "操作员钱包直接充值提现合约",
            target_type: "withdrawal_contract",
            target_id: WITHDRAWAL_CONTRACT,
            detail: JSON.stringify({
              deficit: ethers.formatUnits(deficit, 18),
              txHash: fundTxHash,
            }),
          });
        } else {
          // All sources insufficient - notify admin
          const contractBalanceFormatted = ethers.formatUnits(contractBalance, 18);
          const totalNeededFormatted = ethers.formatUnits(totalNeeded, 18);

          await supabase.from("admin_notifications").insert({
            type: "insufficient_funds",
            title: "提现资金不足",
            message: `提现合约余额: ${contractBalanceFormatted} USDT, 需要: ${totalNeededFormatted} USDT。请及时充值！`,
            is_read: false,
          });

          await supabase.from("admin_logs").insert({
            admin_id: 0,
            admin_username: "system",
            admin_role: "system",
            action: "提现资金不足警告",
            target_type: "withdrawal_contract",
            target_id: WITHDRAWAL_CONTRACT,
            detail: JSON.stringify({
              contractBalance: contractBalanceFormatted,
              totalNeeded: totalNeededFormatted,
              pendingCount: pending.length,
            }),
          });

          return new Response(
            JSON.stringify({
              success: false,
              message: "资金不足：所有资金来源均不足，已通知管理员",
              contractBalance: contractBalanceFormatted,
              needed: totalNeededFormatted,
              pendingCount: pending.length,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 5. Prepare batch data
    const recipients = pending.map((w: any) => w.wallet_address);
    const amounts = pending.map((w: any) => parseUSDT(w.amount.toString()));
    const ids = pending.map((w: any) => w.id);

    // 6. Generate batch ID
    const batchData = new TextEncoder().encode(Date.now().toString() + JSON.stringify(ids));
    const hashBuffer = await crypto.subtle.digest("SHA-256", batchData);
    const batchId = "0x" + Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    const batchIdBytes32 = batchId.slice(0, 66);

    // 7. Check if batch already processed
    const alreadyProcessed = await contract.isBatchProcessed(batchIdBytes32);
    if (alreadyProcessed) {
      return new Response(
        JSON.stringify({ success: false, message: "Batch ID collision, retry" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Send transaction
    const tx = await contract.batchWithdraw(batchIdBytes32, recipients, amounts);
    const receipt = await tx.wait();
    const txHash = receipt.hash;

    // 9. Update database
    const { error: updateError } = await supabase.rpc("mark_withdrawals_processed", {
      p_ids: ids,
      p_batch_id: batchIdBytes32,
      p_tx_hash: txHash,
    });

    if (updateError) {
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

    // 10. Log the action
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
        autoFunded: funded,
        fundTxHash: fundTxHash || undefined,
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
        autoFunded: funded,
        fundTxHash: fundTxHash || undefined,
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
