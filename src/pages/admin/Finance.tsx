import { useQuery } from "@tanstack/react-query";
import { getAdminFinance } from "@/lib/api";
import { DollarSign, TrendingUp, TrendingDown, ArrowDownToLine, Wallet, Percent } from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `rgba(${color === "#ef4444" ? "239,68,68" : color === "#22c55e" ? "34,197,94" : "201,162,39"},0.1)` }}>
          <Icon size={16} style={{ color: color || "#C9A227" }} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-black text-xl" style={{ color: color || "#C9A227" }}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminFinance() {
  const { data, isLoading } = useQuery({ queryKey: ["/api/admin/finance"], queryFn: getAdminFinance });

  if (isLoading) return <div className="text-muted-foreground text-center py-20">加载中...</div>;
  if (!data) return null;
  const d = data as any;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">财务管理</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={TrendingUp} label="总入金(U)" value={parseFloat(d.totalDeposits || 0).toFixed(2)} sub={`${d.totalDepositCount || 0} 笔订单`} color="#22c55e" />
        <StatCard icon={TrendingDown} label="总出金(U)" value={parseFloat(d.totalWithdrawn || 0).toFixed(2)} sub={`${d.totalWithdrawnCount || 0} 笔提现`} color="#ef4444" />
        <StatCard icon={Wallet} label="净余额(U)" value={parseFloat(d.netBalance || 0).toFixed(2)} />
        <StatCard icon={DollarSign} label="活跃质押(U)" value={parseFloat(d.activeStaking || 0).toFixed(2)} />
        <StatCard icon={ArrowDownToLine} label="累计发放收益(U)" value={parseFloat(d.totalEarned || 0).toFixed(2)} />
        <StatCard icon={Percent} label="手续费收入(U)" value={parseFloat(d.totalFees || 0).toFixed(2)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="text-sm font-semibold text-foreground mb-3">入金记录 (按日)</div>
          {(d.depositsByDate || []).length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">暂无数据</div>
          ) : (
            <>
              <div className="flex items-end gap-1 h-32 mb-3">
                {(d.depositsByDate || []).slice(-15).map((item: any, i: number) => {
                  const maxVal = Math.max(...(d.depositsByDate || []).map((x: any) => parseFloat(x.total) || 0), 1);
                  const val = parseFloat(item.total) || 0;
                  const h = Math.max((val / maxVal) * 100, 3);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t" style={{ height: `${h}%`, background: "linear-gradient(180deg, #22c55e, #16a34a)", minHeight: "2px" }} />
                      <span className="text-[7px] text-muted-foreground truncate w-full text-center">{item.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(d.depositsByDate || []).reverse().map((item: any) => (
                  <div key={item.date} className="flex items-center justify-between py-1.5 px-2 rounded text-xs" style={{ background: "rgba(34,197,94,0.04)" }}>
                    <span className="text-muted-foreground">{item.date}</span>
                    <span>{item.count} 笔</span>
                    <span className="font-semibold" style={{ color: "#22c55e" }}>+{parseFloat(item.total).toFixed(2)} U</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="text-sm font-semibold text-foreground mb-3">出金记录 (按日)</div>
          {(d.withdrawalsByDate || []).length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">暂无数据</div>
          ) : (
            <>
              <div className="flex items-end gap-1 h-32 mb-3">
                {(d.withdrawalsByDate || []).slice(-15).map((item: any, i: number) => {
                  const maxVal = Math.max(...(d.withdrawalsByDate || []).map((x: any) => parseFloat(x.total) || 0), 1);
                  const val = parseFloat(item.total) || 0;
                  const h = Math.max((val / maxVal) * 100, 3);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t" style={{ height: `${h}%`, background: "linear-gradient(180deg, #ef4444, #dc2626)", minHeight: "2px" }} />
                      <span className="text-[7px] text-muted-foreground truncate w-full text-center">{item.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(d.withdrawalsByDate || []).reverse().map((item: any) => (
                  <div key={item.date} className="flex items-center justify-between py-1.5 px-2 rounded text-xs" style={{ background: "rgba(239,68,68,0.04)" }}>
                    <span className="text-muted-foreground">{item.date}</span>
                    <span>{item.count} 笔</span>
                    <span className="font-semibold" style={{ color: "#ef4444" }}>-{parseFloat(item.total).toFixed(2)} U</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
