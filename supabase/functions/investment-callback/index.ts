import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.13.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BSC_RPC = Deno.env.get("BSC_RPC_URL") || "https://bsc-dataseed1.binance.org";

// Our contract addresses (must match deployed contracts)
const COREX_INVESTMENT_ADDRESS = "0xD1dA72B8DF0db5d6c61DF96F1E186E73608B5fCB".toLowerCase();
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955".toLowerCase();

// InvestmentCreated(address indexed investor, uint256 indexed productId, uint256 amount, uint256 timestamp)
const INVESTMENT_CREATED_TOPIC = ethers.id("InvestmentCreated(address,uint256,uint256,uint256)");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TxVerification {
  valid: boolean;
  error?: string;
  onChainWallet?: string;
  onChainProductId?: number;
  onChainAmount?: string;
}

async function verifyTransactionOnChain(
  txHash: string,
  expectedWallet: string,
  expectedProductId: number,
  expectedAmount: string,
): Promise<TxVerification> {
  const provider = new ethers.JsonRpcProvider(BSC_RPC, {
    name: "bsc",
    chainId: 56,
  });

  // 1. Get transaction receipt — poll briefly to defend against RPC node sync
  // lag (frontend may have seen the tx confirmed on a different node).
  let receipt = await provider.getTransactionReceipt(txHash);
  for (let i = 0; i < 5 && !receipt; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    receipt = await provider.getTransactionReceipt(txHash);
  }
  if (!receipt) {
    return { valid: false, error: "Transaction not found or not yet confirmed" };
  }

  // 2. Check transaction was successful
  if (receipt.status !== 1) {
    return { valid: false, error: "Transaction failed on-chain" };
  }

  // 3. Check transaction was sent to our CoreXInvestment contract
  if (receipt.to?.toLowerCase() !== COREX_INVESTMENT_ADDRESS) {
    return { valid: false, error: `Transaction target ${receipt.to} is not CoreXInvestment contract` };
  }

  // 4. Find InvestmentCreated event in logs
  const investLog = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() === COREX_INVESTMENT_ADDRESS &&
      log.topics[0] === INVESTMENT_CREATED_TOPIC
  );

  if (!investLog) {
    return { valid: false, error: "No InvestmentCreated event found in transaction" };
  }

  // 5. Decode the event
  // topics[1] = investor (indexed address), topics[2] = productId (indexed uint256)
  // data = amount (uint256) + timestamp (uint256)
  const investor = ethers.getAddress("0x" + investLog.topics[1].slice(26));
  const productId = Number(BigInt(investLog.topics[2]));
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const [amount] = abiCoder.decode(["uint256", "uint256"], investLog.data);

  // 6. Verify investor matches claimed wallet
  if (investor.toLowerCase() !== expectedWallet.toLowerCase()) {
    return {
      valid: false,
      error: `On-chain investor ${investor} does not match claimed wallet ${expectedWallet}`,
      onChainWallet: investor,
    };
  }

  // 7. Verify product ID matches
  if (productId !== expectedProductId) {
    return {
      valid: false,
      error: `On-chain productId ${productId} does not match claimed ${expectedProductId}`,
      onChainProductId: productId,
    };
  }

  // 8. Verify amount matches (convert expected amount to wei for comparison)
  const expectedWei = ethers.parseUnits(expectedAmount, 18);
  if (amount !== expectedWei) {
    return {
      valid: false,
      error: `On-chain amount ${ethers.formatUnits(amount, 18)} does not match claimed ${expectedAmount}`,
      onChainAmount: ethers.formatUnits(amount, 18),
    };
  }

  return {
    valid: true,
    onChainWallet: investor,
    onChainProductId: productId,
    onChainAmount: ethers.formatUnits(amount, 18),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { walletAddress, productId, amount, txHash, productName, dailyRate, days } = await req.json();

    if (!walletAddress || !txHash || !productId || !amount) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // On-chain verification
    const verification = await verifyTransactionOnChain(txHash, walletAddress, productId, amount);
    if (!verification.valid) {
      console.error(`TX verification failed for ${txHash}: ${verification.error}`);
      return new Response(
        JSON.stringify({ success: false, message: `Transaction verification failed: ${verification.error}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Use the DB function to create order with duplicate check
    const { data, error } = await supabase.rpc("create_order_from_tx", {
      p_wallet_address: walletAddress,
      p_product_id: productId,
      p_amount: amount,
      p_tx_hash: txHash,
      p_product_name: productName,
      p_daily_rate: dailyRate,
      p_days: days,
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, orderId: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
