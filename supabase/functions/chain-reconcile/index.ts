import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.13.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const THIRDWEB_SECRET_KEY = Deno.env.get("THIRDWEB_SECRET_KEY")!;

const COREX_INVESTMENT_ADDRESS = "0xaa6882633A0179815208c18780321218B44D6f2c";
const EVENT_SIGNATURE = "InvestmentCreated(address,uint256,uint256,uint256)";
const EVENT_TOPIC = ethers.id(EVENT_SIGNATURE);
const CHAIN_ID = 56;
const LOOKBACK_SECONDS = 3600;
const BSC_RPC = Deno.env.get("BSC_RPC_URL") || "https://bsc-dataseed1.binance.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsightEvent {
  block_number: number;
  block_timestamp: number;
  transaction_hash: string;
  topics: string[];
  data: string;
}

async function fetchEventsSince(sinceTs: number): Promise<InsightEvent[]> {
  const sig = encodeURIComponent(EVENT_SIGNATURE);
  const params = new URLSearchParams({ chain: String(CHAIN_ID), limit: "200", sort_order: "desc", filter_block_timestamp_gte: String(sinceTs) });
  const url = `https://insight.thirdweb.com/v1/events/${COREX_INVESTMENT_ADDRESS}/${sig}?${params}`;
  const resp = await fetch(url, { headers: { "x-secret-key": THIRDWEB_SECRET_KEY } });
  if (!resp.ok) throw new Error(`Insight API ${resp.status}: ${await resp.text()}`);
  const json = await resp.json();
  return json.data ?? [];
}

async function fetchEventForTxFromRpc(txHash: string): Promise<InsightEvent | null> {
  const resp = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [txHash] }),
  });
  const json = await resp.json();
  const receipt = json.result;
  if (!receipt) return null;
  if (receipt.status !== "0x1") throw new Error(`Transaction ${txHash} failed on-chain`);
  if (receipt.to?.toLowerCase() !== COREX_INVESTMENT_ADDRESS.toLowerCase()) {
    throw new Error(`Transaction target ${receipt.to} is not CoreXInvestment contract`);
  }
  const log = receipt.logs.find(
    (l: any) => l.address.toLowerCase() === COREX_INVESTMENT_ADDRESS.toLowerCase() && l.topics[0] === EVENT_TOPIC,
  );
  if (!log) throw new Error("No InvestmentCreated event found in transaction logs");
  const blockResp = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "eth_getBlockByNumber", params: [receipt.blockNumber, false] }),
  });
  const blockJson = await blockResp.json();
  const blockTs = blockJson.result ? parseInt(blockJson.result.timestamp, 16) : 0;
  return {
    block_number: parseInt(receipt.blockNumber, 16),
    block_timestamp: blockTs,
    transaction_hash: receipt.transactionHash,
    topics: log.topics,
    data: log.data,
  };
}

function decode(e: InsightEvent) {
  const investor = ("0x" + e.topics[1].slice(26)).toLowerCase();
  const productId = Number(BigInt(e.topics[2]));
  const amountWei = BigInt("0x" + e.data.slice(2, 66));
  const amount = ethers.formatUnits(amountWei, 18);
  return { investor, productId, amount, txHash: e.transaction_hash, blockTs: e.block_timestamp };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let txHash: string | undefined;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.txHash) txHash = String(body.txHash).toLowerCase();
      } catch { /* empty body is fine */ }
    }

    let events: InsightEvent[];
    if (txHash) {
      const ev = await fetchEventForTxFromRpc(txHash);
      if (!ev) {
        return new Response(
          JSON.stringify({ success: false, message: `Transaction ${txHash} not found on BSC. May not yet be confirmed.` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      events = [ev];
    } else {
      events = await fetchEventsSince(Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS);
    }

    const result = { scanned: events.length, inserted: 0, skipped: 0, errored: 0, errors: [] as any[] };

    for (const raw of events) {
      const ev = decode(raw);

      const { data: existing } = await supabase
        .from("orders").select("id").eq("tx_hash", ev.txHash).maybeSingle();
      if (existing) { result.skipped++; continue; }

      const { data: product } = await supabase
        .from("products").select("name, daily_rate, days").eq("id", ev.productId).maybeSingle();
      if (!product) {
        result.errored++;
        result.errors.push({ tx: ev.txHash, error: `product ${ev.productId} not found` });
        continue;
      }

      const { error } = await supabase.rpc("create_order_from_tx", {
        p_wallet_address: ev.investor,
        p_product_id: ev.productId,
        p_amount: ev.amount,
        p_tx_hash: ev.txHash,
        p_product_name: product.name,
        p_daily_rate: String(product.daily_rate),
        p_days: product.days,
      });

      if (error) {
        if (error.message?.includes("already processed")) { result.skipped++; continue; }
        result.errored++;
        result.errors.push({ tx: ev.txHash, error: error.message });
      } else {
        result.inserted++;
        console.log(`reconcile: backfilled ${ev.txHash} for ${ev.investor} (product ${ev.productId}, ${ev.amount} USDT)`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, elapsed_ms: Date.now() - startedAt, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("chain-reconcile error:", err.message);
    return new Response(
      JSON.stringify({ success: false, message: err.message, elapsed_ms: Date.now() - startedAt }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
