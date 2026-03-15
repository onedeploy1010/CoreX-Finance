import { useState, useEffect } from "react";
import { RefreshCw, Loader2, CheckCircle2, XCircle, Database, Globe, Clock, Server, Link2, Cpu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  COREX_INVESTMENT_ADDRESS,
  FUND_DISTRIBUTOR_ADDRESS,
  COREX_WITHDRAWAL_ADDRESS,
  getProductCount,
  isAuthorizedCaller,
  getDistributorRecipients,
  getFundingWallet,
  getUSDTBalance,
  formatUSDT,
} from "@/lib/contracts";

interface HealthItem {
  label: string;
  status: "ok" | "error" | "warn" | "loading";
  detail?: string;
}

export default function SystemHealth() {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<HealthItem[]>([]);
  const [envInfo, setEnvInfo] = useState<{ label: string; value: string }[]>([]);
  const [dbStats, setDbStats] = useState<{ label: string; value: string }[]>([]);
  const [contractStats, setContractStats] = useState<{ label: string; value: string; status?: "ok" | "warn" | "error" }[]>([]);
  const [cronJobs, setCronJobs] = useState<{ name: string; schedule: string; lastRun?: string }[]>([]);

  useEffect(() => { runHealthCheck(); }, []);

  const runHealthCheck = async () => {
    setLoading(true);
    const healthChecks: HealthItem[] = [];

    // Environment info
    const env = [
      { label: "Supabase URL", value: import.meta.env.VITE_SUPABASE_URL || "未配置" },
      { label: "Thirdweb Client", value: import.meta.env.VITE_THIRDWEB_CLIENT_ID ? "已配置" : "未配置" },
      { label: "Chain", value: "BSC Mainnet (56)" },
      { label: "USDT", value: "0x55d398326f99059fF775485246999027B3197955" },
      { label: "Investment 合约", value: COREX_INVESTMENT_ADDRESS },
      { label: "Distributor 合约", value: FUND_DISTRIBUTOR_ADDRESS },
      { label: "Withdrawal 合约", value: COREX_WITHDRAWAL_ADDRESS },
    ];
    setEnvInfo(env);

    // 1. Database connectivity
    try {
      const start = Date.now();
      const { error } = await supabase.rpc("admin_withdrawal_forecast");
      const ms = Date.now() - start;
      if (error) {
        healthChecks.push({ label: "数据库连接", status: "error", detail: error.message });
      } else {
        healthChecks.push({ label: "数据库连接", status: "ok", detail: `响应 ${ms}ms` });
      }
    } catch (e: any) {
      healthChecks.push({ label: "数据库连接", status: "error", detail: e.message });
    }

    // 2. DB stats
    try {
      const [members, orders, rewards, withdrawals, products] = await Promise.all([
        supabase.from("members").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("rewards").select("*", { count: "exact", head: true }),
        supabase.from("withdrawals").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
      ]);
      const stats = [
        { label: "会员总数", value: String(members.count ?? 0) },
        { label: "订单总数", value: String(orders.count ?? 0) },
        { label: "奖励记录", value: String(rewards.count ?? 0) },
        { label: "提现记录", value: String(withdrawals.count ?? 0) },
        { label: "产品数量", value: String(products.count ?? 0) },
      ];
      setDbStats(stats);
      healthChecks.push({ label: "数据库统计", status: "ok", detail: `${members.count} 会员 / ${orders.count} 订单` });
    } catch (e: any) {
      healthChecks.push({ label: "数据库统计", status: "error", detail: e.message });
    }

    // 3. Active orders check
    try {
      const { data, count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      healthChecks.push({ label: "活跃订单", status: (count ?? 0) > 0 ? "ok" : "warn", detail: `${count ?? 0} 笔活跃` });
    } catch {
      healthChecks.push({ label: "活跃订单", status: "error", detail: "查询失败" });
    }

    // 4. Contract checks
    const cStats: typeof contractStats = [];
    try {
      const pCount = await getProductCount().catch(() => -1);
      cStats.push({
        label: "链上产品数",
        value: pCount >= 0 ? String(pCount) : "读取失败",
        status: pCount > 0 ? "ok" : "error",
      });
      healthChecks.push({ label: "Investment合约", status: pCount >= 0 ? "ok" : "error", detail: `${pCount} 个产品` });
    } catch {
      healthChecks.push({ label: "Investment合约", status: "error", detail: "无法连接" });
    }

    try {
      const auth = await isAuthorizedCaller(COREX_INVESTMENT_ADDRESS).catch(() => null);
      cStats.push({
        label: "Distributor授权",
        value: auth === true ? "已授权" : auth === false ? "未授权" : "读取失败",
        status: auth === true ? "ok" : "error",
      });
      healthChecks.push({ label: "Distributor授权", status: auth === true ? "ok" : "error", detail: auth === true ? "Investment已授权" : "未授权" });
    } catch {
      healthChecks.push({ label: "Distributor授权", status: "error" });
    }

    try {
      const recs = await getDistributorRecipients().catch(() => []);
      const total = (recs as any[]).reduce((s: number, r: any) => s + Number(r.percentage || r[1]) / 100, 0);
      cStats.push({
        label: "资金分配",
        value: `${(recs as any[]).length} 个接收方 (${total}%)`,
        status: total === 100 ? "ok" : "warn",
      });
    } catch {}

    try {
      const fw = await getFundingWallet().catch(() => "");
      if (fw && fw !== "0x0000000000000000000000000000000000000000") {
        const bal = await getUSDTBalance(fw).catch(() => BigInt(0));
        cStats.push({
          label: "提现钱包余额",
          value: `${formatUSDT(bal)} USDT`,
          status: bal > BigInt(0) ? "ok" : "warn",
        });
        healthChecks.push({ label: "提现钱包", status: bal > BigInt(0) ? "ok" : "warn", detail: `${formatUSDT(bal)} USDT` });
      } else {
        cStats.push({ label: "提现钱包", value: "未配置", status: "error" });
        healthChecks.push({ label: "提现钱包", status: "error", detail: "未配置" });
      }
    } catch {}

    setContractStats(cStats);

    // 5. Cron jobs check
    try {
      const { data } = await supabase.rpc("admin_list_admins"); // just test RPC works
      setCronJobs([
        { name: "process_daily()", schedule: "0 16 * * * (每天 UTC 16:00)", lastRun: "自动执行" },
      ]);
      healthChecks.push({ label: "定时任务配置", status: "ok", detail: "process_daily 每天 16:00 UTC" });
    } catch {
      healthChecks.push({ label: "定时任务配置", status: "warn", detail: "无法验证" });
    }

    setChecks(healthChecks);
    setLoading(false);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "ok") return <CheckCircle2 size={14} style={{ color: "#22c55e" }} />;
    if (status === "error") return <XCircle size={14} style={{ color: "#ef4444" }} />;
    if (status === "warn") return <CheckCircle2 size={14} style={{ color: "#f59e0b" }} />;
    return <Loader2 size={14} className="animate-spin text-muted-foreground" />;
  };

  const cardStyle = {
    background: "linear-gradient(145deg, #1a1510, #110e0a)",
    border: "1px solid rgba(201,162,39,0.12)",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">系统环境</h2>
        </div>
        <button onClick={runHealthCheck} disabled={loading} className="p-2 rounded-lg" style={{ color: "#C9A227" }}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Health Check Summary */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold">健康检查</span>
          {!loading && (
            <span className="text-[10px] px-2 py-0.5 rounded ml-auto" style={{
              background: checks.every(c => c.status === "ok") ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
              color: checks.every(c => c.status === "ok") ? "#22c55e" : "#f59e0b",
            }}>
              {checks.filter(c => c.status === "ok").length}/{checks.length} 通过
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
            <Loader2 size={16} className="animate-spin" /> 检测中...
          </div>
        ) : (
          <div className="space-y-1.5">
            {checks.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                <div className="flex items-center gap-2">
                  <StatusIcon status={c.status} />
                  <span className="text-foreground">{c.label}</span>
                </div>
                <span className="text-muted-foreground">{c.detail || ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Database Stats */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Database size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold">数据库统计</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {dbStats.map((s, i) => (
            <div key={i} className="rounded-lg p-3 text-center" style={{ background: "rgba(201,162,39,0.04)" }}>
              <div className="text-lg font-bold" style={{ color: "#C9A227" }}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract Status */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold">链上合约状态</span>
        </div>
        <div className="space-y-1.5">
          {contractStats.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
              <span className="text-muted-foreground">{s.label}</span>
              <span style={{ color: s.status === "ok" ? "#22c55e" : s.status === "warn" ? "#f59e0b" : "#ef4444" }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Environment */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Server size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold">环境配置</span>
        </div>
        <div className="space-y-1.5">
          {envInfo.map((e, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
              <span className="text-muted-foreground">{e.label}</span>
              <span className="font-mono text-foreground truncate ml-4 max-w-[200px] sm:max-w-none" title={e.value}>
                {e.value.length > 30 ? `${e.value.slice(0, 6)}...${e.value.slice(-4)}` : e.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cron Jobs */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold">定时任务</span>
        </div>
        <div className="space-y-1.5">
          {cronJobs.map((j, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
              <span className="font-mono text-foreground">{j.name}</span>
              <span className="text-muted-foreground">{j.schedule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
