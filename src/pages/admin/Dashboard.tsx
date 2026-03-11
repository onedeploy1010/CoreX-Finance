import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "@/lib/api";
import { Users, ShoppingCart, ArrowDownToLine, DollarSign, TrendingUp, Clock, Crown } from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,162,39,0.1)" }}>
          <Icon size={16} style={{ color: color || "#C9A227" }} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-black text-xl" style={{ color: color || "#C9A227" }}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function SimpleBarChart({ data, labelKey, valueKey, title }: { data: any[]; labelKey: string; valueKey: string; title: string }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0), 1);
  return (
    <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
      <div className="text-sm font-semibold text-foreground mb-3">{title}</div>
      <div className="flex items-end gap-1 h-32">
        {data.slice(-15).map((d, i) => {
          const val = parseFloat(d[valueKey]) || 0;
          const h = Math.max((val / maxVal) * 100, 3);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t" style={{ height: `${h}%`, background: "linear-gradient(180deg, #C9A227, #9A7A1A)", minHeight: "2px" }} />
              <span className="text-[8px] text-muted-foreground truncate w-full text-center">{d[labelKey]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["/api/admin/dashboard"], queryFn: getAdminDashboard });

  if (isLoading) return <div className="text-muted-foreground text-center py-20">加载中...</div>;
  if (!data) return null;
  const d = data as any;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">统计台</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="总会员" value={d.memberCount?.toString() || "0"} />
        <StatCard icon={ShoppingCart} label="总订单" value={d.orderCount?.toString() || "0"} sub={`活跃 ${d.activeOrderCount || 0}`} />
        <StatCard icon={DollarSign} label="活跃质押(U)" value={parseFloat(d.totalStaking || 0).toFixed(2)} />
        <StatCard icon={TrendingUp} label="累计发放(U)" value={parseFloat(d.totalEarned || 0).toFixed(2)} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ArrowDownToLine} label="累计提现(U)" value={parseFloat(d.totalWithdrawn || 0).toFixed(2)} sub={`${d.withdrawalCount || 0} 笔`} />
        <StatCard icon={Clock} label="待审提现" value={d.pendingWithdrawals?.count?.toString() || "0"} sub={`${parseFloat(d.pendingWithdrawals?.total || 0).toFixed(2)} U`} color="#ef4444" />
        <StatCard icon={DollarSign} label="累计奖励(U)" value={parseFloat(d.totalRewards || 0).toFixed(2)} />
        <StatCard icon={ShoppingCart} label="已完成订单(U)" value={parseFloat(d.completedOrderAmount || 0).toFixed(2)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SimpleBarChart data={d.dailyMemberCounts || []} labelKey="date" valueKey="count" title="每日注册会员" />
        <SimpleBarChart data={d.dailyOrderAmounts || []} labelKey="date" valueKey="total" title="每日质押金额(U)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="text-sm font-semibold text-foreground mb-3">等级分布</div>
          <div className="space-y-2">
            {(d.levelDistribution || []).map((l: any) => {
              const total = d.memberCount || 1;
              const pct = ((l.count / total) * 100).toFixed(1);
              return (
                <div key={l.level} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <Crown size={12} style={{ color: "#C9A227" }} />
                    <span className="text-xs font-semibold" style={{ color: "#C9A227" }}>{l.level === 0 ? "普通" : `V${l.level}`}</span>
                  </div>
                  <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "rgba(201,162,39,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #C9A227, #9A7A1A)", minWidth: "8px" }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">{l.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="text-sm font-semibold text-foreground mb-3">最新注册</div>
          <div className="space-y-2">
            {(d.recentMembers || []).map((m: any) => {
              const addr = m.wallet_address || m.walletAddress || "";
              const created = m.created_at || m.createdAt || "";
              return (
                <div key={m.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                  <span className="text-xs font-mono text-muted-foreground">{addr.slice(0, 8)}...{addr.slice(-6)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}>
                      {m.level === 0 ? "普通" : `V${m.level}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(created).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
