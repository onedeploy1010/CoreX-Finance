import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminFinance, getAdminFinanceMonthly, getAdminWithdrawalForecast } from "@/lib/api";
import { DollarSign, TrendingUp, TrendingDown, ArrowDownToLine, Wallet, Percent, AlertTriangle, Calendar, BarChart3, Loader2, Clock, Banknote, ChevronDown, ChevronRight } from "lucide-react";

const cardBg = { background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" };

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={cardBg}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `rgba(${color === "#ef4444" ? "239,68,68" : color === "#22c55e" ? "34,197,94" : color === "#f59e0b" ? "245,158,11" : "201,162,39"},0.1)` }}>
          <Icon size={16} style={{ color: color || "#C9A227" }} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-black text-xl" style={{ color: color || "#C9A227" }}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function fmt(v: string | number) {
  return parseFloat(String(v) || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtN(v: string | number) {
  return parseFloat(String(v) || "0");
}

function MonthLabel({ month }: { month: string }) {
  const [y, m] = month.split("-");
  return <span>{y}年{parseInt(m)}月</span>;
}

function shortAddr(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
}

function ForecastTab({ fc }: { fc: any }) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(month) ? next.delete(month) : next.add(month);
      return next;
    });
  };

  const dailyTotal = fmtN(fc.dailyTotal);
  const expirationByDay: any[] = fc.expirationByDay || [];
  const expirationByMonth: any[] = fc.expirationByMonth || [];

  // Build month -> days mapping
  const monthDaysMap = new Map<string, any[]>();
  expirationByDay.forEach((d: any) => {
    const m = d.exp_date.substring(0, 7);
    if (!monthDaysMap.has(m)) monthDaysMap.set(m, []);
    monthDaysMap.get(m)!.push(d);
  });

  return (
    <div className="space-y-4">
      {/* Daily payout breakdown */}
      <div className="rounded-xl p-4" style={cardBg}>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold text-foreground">每日预计支出 (精算)</span>
        </div>
        <div className="text-xs text-muted-foreground mb-3">
          基于 {fc.activeOrderCount || 0} 笔活跃订单 / 总质押 {fmt(fc.activeStaking)} U
        </div>
        <div className="space-y-2">
          {[
            { label: "日利息", value: fc.dailyInterest, color: "#E8C547", desc: "所有活跃订单的每日收益" },
            { label: "直推奖励", value: fc.dailyDirect, color: "#F0D060", desc: "10% 日利息" },
            { label: "间推奖励", value: fc.dailyIndirect, color: "#D4AF37", desc: "5% 日利息" },
            { label: "团队分红", value: fc.dailyTeam, color: "#FFD700", desc: "团队质押 x 利率 x 等级比例" },
            { label: "同级奖励", value: fc.dailyEqualLevel, color: "#FF8C00", desc: "团队分红的10%" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div className="text-xs font-semibold" style={{ color: item.color }}>{item.label}</div>
                <div className="text-[10px] text-muted-foreground">{item.desc}</div>
              </div>
              <div className="font-bold text-sm" style={{ color: item.color }}>{fmt(item.value)}</div>
            </div>
          ))}
          <div className="flex items-center justify-between py-3 px-3 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="text-xs font-bold" style={{ color: "#ef4444" }}>每日总支出</div>
            <div className="font-black text-lg" style={{ color: "#ef4444" }}>{fmt(fc.dailyTotal)} U</div>
          </div>
        </div>
      </div>

      {/* Pending withdrawals */}
      <div className="rounded-xl p-4" style={{ ...cardBg, borderColor: "rgba(245,158,11,0.3)" }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
          <span className="text-sm font-bold" style={{ color: "#f59e0b" }}>提现压力</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="text-[10px] text-muted-foreground mb-1">待处理提现</div>
            <div className="font-black text-lg" style={{ color: "#ef4444" }}>{fmt(fc.pendingWithdrawals?.totalAmount || 0)}</div>
            <div className="text-[10px] text-muted-foreground">{fc.pendingWithdrawals?.count || 0} 笔</div>
          </div>
          <div className="rounded-lg p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="text-[10px] text-muted-foreground mb-1">未提现余额</div>
            <div className="font-black text-lg" style={{ color: "#f59e0b" }}>{fmt(fc.unrealizedBalance)}</div>
            <div className="text-[10px] text-muted-foreground">所有用户可提总额</div>
          </div>
        </div>
      </div>

      {/* Monthly forecast calendar */}
      <div className="rounded-xl p-4" style={cardBg}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold text-foreground">月度支出预测</span>
        </div>
        <div className="space-y-2">
          {expirationByMonth.map((m: any) => {
            const [y, mo] = m.month.split("-");
            const monthLabel = `${y}年${parseInt(mo)}月`;
            const principalAmt = fmtN(m.principal);
            const daysInMonth = new Date(parseInt(y), parseInt(mo), 0).getDate();
            const rewardsPayout = dailyTotal * daysInMonth;
            const monthTotal = rewardsPayout + principalAmt;
            const isExpanded = expandedMonths.has(m.month);
            const dayEntries = monthDaysMap.get(m.month) || [];

            return (
              <div key={m.month}>
                <button
                  className="w-full rounded-lg p-3 text-left transition-all"
                  style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.12)" }}
                  onClick={() => toggleMonth(m.month)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={12} style={{ color: "#C9A227" }} /> : <ChevronRight size={12} style={{ color: "#C9A227" }} />}
                      <span className="text-xs font-bold text-foreground">{monthLabel}</span>
                    </div>
                    <span className="font-black text-sm" style={{ color: "#ef4444" }}>{fmt(monthTotal)} U</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] pl-5">
                    <div>
                      <span className="text-muted-foreground">奖励支出</span>
                      <div className="font-semibold" style={{ color: "#E8C547" }}>{fmt(rewardsPayout)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">到期本金</span>
                      <div className="font-semibold" style={{ color: "#f59e0b" }}>{fmt(principalAmt)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">到期订单</span>
                      <div className="font-semibold text-foreground">{m.order_count} 笔</div>
                    </div>
                  </div>
                </button>

                {/* Expanded: show day-by-day within this month */}
                {isExpanded && dayEntries.length > 0 && (
                  <div className="ml-3 mt-1 space-y-1">
                    {dayEntries.map((day: any) => {
                      const isDayExpanded = expandedDays.has(day.exp_date);
                      const dayPrincipal = fmtN(day.principal);
                      const dayRewards = dailyTotal;
                      return (
                        <div key={day.exp_date}>
                          <button
                            className="w-full rounded-lg px-3 py-2 text-left"
                            style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.08)" }}
                            onClick={() => toggleDay(day.exp_date)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isDayExpanded ? <ChevronDown size={10} style={{ color: "#f59e0b" }} /> : <ChevronRight size={10} style={{ color: "#f59e0b" }} />}
                                <span className="text-xs font-mono text-muted-foreground">{day.exp_date}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground">{day.order_count} 笔到期</span>
                                <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>本金 {fmt(dayPrincipal)} U</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-1 pl-5 text-[10px] text-muted-foreground">
                              <span>奖励 <span style={{ color: "#E8C547" }}>{fmt(dayRewards)}</span></span>
                              <span>合计 <span style={{ color: "#ef4444" }}>{fmt(dayPrincipal + dayRewards)}</span></span>
                            </div>
                          </button>

                          {/* Expanded: show individual orders */}
                          {isDayExpanded && (
                            <div className="ml-6 mt-1 space-y-1">
                              {(day.orders || []).map((order: any) => (
                                <div key={order.id} className="rounded px-3 py-2 text-[10px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-foreground">{order.product}</span>
                                    <span className="font-bold" style={{ color: "#f59e0b" }}>{fmt(order.amount)} U</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1 text-muted-foreground">
                                    <span className="font-mono">{shortAddr(order.wallet)}</span>
                                    <span>{order.rate}%/日 · {order.startDate} ~ {order.endDate}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {expirationByMonth.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6">暂无活跃订单</div>
        )}
      </div>

      {/* 30/60/90 day summary */}
      <div className="rounded-xl p-4" style={cardBg}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={14} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold text-foreground">综合支出预测</span>
        </div>
        <div className="space-y-2">
          {[30, 60, 90].map(days => {
            const rewardPayout = dailyTotal * days;
            // Sum principal returns within this period
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() + days);
            const cutoffStr = cutoff.toISOString().slice(0, 10);
            const principal = expirationByDay
              .filter((d: any) => d.exp_date <= cutoffStr)
              .reduce((sum: number, d: any) => sum + fmtN(d.principal), 0);
            const total = rewardPayout + principal;
            const expiringOrders = expirationByDay
              .filter((d: any) => d.exp_date <= cutoffStr)
              .reduce((sum: number, d: any) => sum + d.order_count, 0);
            return (
              <div key={days} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground">{days}天预测</span>
                  <span className="font-black text-base" style={{ color: "#ef4444" }}>{fmt(total)} U</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">奖励支出</span>
                    <div className="font-semibold" style={{ color: "#E8C547" }}>{fmt(rewardPayout)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">到期本金</span>
                    <div className="font-semibold" style={{ color: "#f59e0b" }}>{fmt(principal)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">到期订单</span>
                    <div className="font-semibold text-foreground">{expiringOrders} 笔</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">日均</span>
                    <div className="font-semibold text-foreground">{fmt(dailyTotal)}/日</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active order by product */}
      <div className="rounded-xl p-4" style={cardBg}>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={14} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold text-foreground">活跃配套分布</span>
        </div>
        {(fc.byProduct || []).length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">暂无活跃订单</div>
        ) : (
          <div className="space-y-2">
            {(fc.byProduct || []).map((p: any, i: number) => {
              const totalAmt = fmtN(fc.activeStaking || 1);
              const pAmt = fmtN(p.staking);
              const pct = totalAmt > 0 ? (pAmt / totalAmt * 100) : 0;
              return (
                <div key={i} className="rounded-lg p-3" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.1)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground">{p.name}</span>
                    <span className="text-xs font-semibold" style={{ color: "#C9A227" }}>{p.rate}%/日</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] mb-2">
                    <div>
                      <span className="text-muted-foreground">订单数</span>
                      <div className="font-semibold text-foreground">{p.count} 笔</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">总金额</span>
                      <div className="font-semibold" style={{ color: "#C9A227" }}>{fmt(p.staking)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">日产出</span>
                      <div className="font-semibold" style={{ color: "#E8C547" }}>{fmt(p.daily_payout)}</div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #C9A227, #E8C547)" }} />
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1">{pct.toFixed(1)}% 占比</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminFinance() {
  const [activeSection, setActiveSection] = useState<"overview" | "monthly" | "forecast">("overview");
  const { data, isLoading } = useQuery({ queryKey: ["/api/admin/finance"], queryFn: getAdminFinance });
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({ queryKey: ["/api/admin/finance/monthly"], queryFn: getAdminFinanceMonthly });
  const { data: forecastData, isLoading: forecastLoading } = useQuery({ queryKey: ["/api/admin/finance/forecast"], queryFn: getAdminWithdrawalForecast });

  if (isLoading) return <div className="text-muted-foreground text-center py-20">加载中...</div>;
  if (!data) return null;
  const d = data as any;
  const m = monthlyData as any;
  const fc = forecastData as any;

  const sections = [
    { key: "overview" as const, label: "总览" },
    { key: "monthly" as const, label: "月度分析" },
    { key: "forecast" as const, label: "提现预测" },
  ];

  // Build merged monthly table data
  const monthMap = new Map<string, any>();
  if (m) {
    (m.monthlyDeposits || []).forEach((x: any) => {
      const e = monthMap.get(x.month) || { month: x.month };
      e.deposits = fmtN(x.total);
      e.depositCount = x.count;
      monthMap.set(x.month, e);
    });
    (m.monthlyRewards || []).forEach((x: any) => {
      const e = monthMap.get(x.month) || { month: x.month };
      e.daily = fmtN(x.daily_total);
      e.direct = fmtN(x.direct_total);
      e.indirect = fmtN(x.indirect_total);
      e.team = fmtN(x.team_total);
      e.equalLevel = fmtN(x.equal_level_total);
      e.rewardTotal = fmtN(x.all_total);
      monthMap.set(x.month, e);
    });
    (m.monthlyWithdrawals || []).forEach((x: any) => {
      const e = monthMap.get(x.month) || { month: x.month };
      e.withdrawn = fmtN(x.total);
      e.withdrawnFees = fmtN(x.fees);
      e.withdrawnCount = x.count;
      monthMap.set(x.month, e);
    });
  }
  const monthlyRows = Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">财务管理</h2>
      </div>

      {/* Section tabs */}
      <div className="flex rounded-lg p-1 gap-1" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
        {sections.map(s => (
          <button key={s.key}
            className="flex-1 py-2 text-sm font-semibold rounded-md transition-all"
            style={activeSection === s.key
              ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
              : { color: "rgba(255,255,255,0.5)" }}
            onClick={() => setActiveSection(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW ===== */}
      {activeSection === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard icon={TrendingUp} label="总入金(U)" value={fmt(d.totalDeposits)} sub={`${d.totalDepositCount || 0} 笔订单`} color="#22c55e" />
            <StatCard icon={TrendingDown} label="总出金(U)" value={fmt(d.totalWithdrawn)} sub={`${d.totalWithdrawnCount || 0} 笔提现`} color="#ef4444" />
            <StatCard icon={Wallet} label="净余额(U)" value={fmt(d.netBalance)} />
            <StatCard icon={DollarSign} label="活跃质押(U)" value={fmt(d.activeStaking)} />
            <StatCard icon={ArrowDownToLine} label="累计发放收益(U)" value={fmt(d.totalEarned)} />
            <StatCard icon={Percent} label="手续费收入(U)" value={fmt(d.totalFees)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={cardBg}>
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
                    {[...(d.depositsByDate || [])].reverse().map((item: any) => (
                      <div key={item.date} className="flex items-center justify-between py-1.5 px-2 rounded text-xs" style={{ background: "rgba(34,197,94,0.04)" }}>
                        <span className="text-muted-foreground">{item.date}</span>
                        <span>{item.count} 笔</span>
                        <span className="font-semibold" style={{ color: "#22c55e" }}>+{fmt(item.total)} U</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl p-4" style={cardBg}>
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
                    {[...(d.withdrawalsByDate || [])].reverse().map((item: any) => (
                      <div key={item.date} className="flex items-center justify-between py-1.5 px-2 rounded text-xs" style={{ background: "rgba(239,68,68,0.04)" }}>
                        <span className="text-muted-foreground">{item.date}</span>
                        <span>{item.count} 笔</span>
                        <span className="font-semibold" style={{ color: "#ef4444" }}>-{fmt(item.total)} U</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== MONTHLY ANALYSIS ===== */}
      {activeSection === "monthly" && (
        monthlyLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={cardBg}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={14} style={{ color: "#C9A227" }} />
                <span className="text-sm font-semibold text-foreground">月度收支统计</span>
              </div>
              {monthlyRows.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">暂无数据</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">月份</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: "#22c55e" }}>入金</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: "#ef4444" }}>支出合计</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: "#f59e0b" }}>提现</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: "#C9A227" }}>利润</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRows.map(row => {
                        const deposits = row.deposits || 0;
                        const totalOut = (row.rewardTotal || 0);
                        const profit = deposits - totalOut;
                        return (
                          <tr key={row.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td className="py-2.5 px-2 text-muted-foreground"><MonthLabel month={row.month} /></td>
                            <td className="py-2.5 px-2 text-right font-semibold" style={{ color: "#22c55e" }}>{fmt(deposits)}</td>
                            <td className="py-2.5 px-2 text-right font-semibold" style={{ color: "#ef4444" }}>{fmt(totalOut)}</td>
                            <td className="py-2.5 px-2 text-right font-semibold" style={{ color: "#f59e0b" }}>{fmt(row.withdrawn || 0)}</td>
                            <td className="py-2.5 px-2 text-right font-bold" style={{ color: profit >= 0 ? "#22c55e" : "#ef4444" }}>
                              {profit >= 0 ? "+" : ""}{fmt(profit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl p-4" style={cardBg}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} style={{ color: "#C9A227" }} />
                <span className="text-sm font-semibold text-foreground">月度奖励明细</span>
              </div>
              {monthlyRows.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">暂无数据</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
                        <th className="text-left py-2 px-1.5 text-muted-foreground font-medium">月份</th>
                        <th className="text-right py-2 px-1.5 font-medium" style={{ color: "#E8C547" }}>日收益</th>
                        <th className="text-right py-2 px-1.5 font-medium" style={{ color: "#F0D060" }}>直推</th>
                        <th className="text-right py-2 px-1.5 font-medium" style={{ color: "#D4AF37" }}>间推</th>
                        <th className="text-right py-2 px-1.5 font-medium" style={{ color: "#FFD700" }}>团队</th>
                        <th className="text-right py-2 px-1.5 font-medium" style={{ color: "#FF8C00" }}>同级</th>
                        <th className="text-right py-2 px-1.5 font-medium text-foreground">合计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRows.map(row => (
                        <tr key={row.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td className="py-2.5 px-1.5 text-muted-foreground"><MonthLabel month={row.month} /></td>
                          <td className="py-2.5 px-1.5 text-right" style={{ color: "#E8C547" }}>{fmt(row.daily || 0)}</td>
                          <td className="py-2.5 px-1.5 text-right" style={{ color: "#F0D060" }}>{fmt(row.direct || 0)}</td>
                          <td className="py-2.5 px-1.5 text-right" style={{ color: "#D4AF37" }}>{fmt(row.indirect || 0)}</td>
                          <td className="py-2.5 px-1.5 text-right" style={{ color: "#FFD700" }}>{fmt(row.team || 0)}</td>
                          <td className="py-2.5 px-1.5 text-right" style={{ color: "#FF8C00" }}>{fmt(row.equalLevel || 0)}</td>
                          <td className="py-2.5 px-1.5 text-right font-bold text-foreground">{fmt(row.rewardTotal || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {monthlyRows.length > 0 && (
              <div className="rounded-xl p-4" style={cardBg}>
                <div className="text-sm font-semibold text-foreground mb-3">月度入金 vs 支出</div>
                <div className="space-y-2">
                  {monthlyRows.slice(0, 6).map(row => {
                    const maxVal = Math.max(...monthlyRows.slice(0, 6).map(r => Math.max(r.deposits || 0, r.rewardTotal || 0)), 1);
                    const dW = Math.max(((row.deposits || 0) / maxVal) * 100, 1);
                    const rW = Math.max(((row.rewardTotal || 0) / maxVal) * 100, 1);
                    return (
                      <div key={row.month} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground w-16"><MonthLabel month={row.month} /></span>
                          <span style={{ color: "#22c55e" }}>+{fmt(row.deposits || 0)}</span>
                          <span style={{ color: "#ef4444" }}>-{fmt(row.rewardTotal || 0)}</span>
                        </div>
                        <div className="flex gap-1 h-3">
                          <div className="rounded-sm" style={{ width: `${dW}%`, background: "linear-gradient(90deg, #22c55e, #16a34a)" }} />
                          <div className="rounded-sm" style={{ width: `${rW}%`, background: "linear-gradient(90deg, #ef4444, #dc2626)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#22c55e" }} /> 入金</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#ef4444" }} /> 奖励支出</div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ===== WITHDRAWAL FORECAST ===== */}
      {activeSection === "forecast" && (
        forecastLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
          </div>
        ) : !fc ? null : (
          <ForecastTab fc={fc} />
        )
      )}
    </div>
  );
}
