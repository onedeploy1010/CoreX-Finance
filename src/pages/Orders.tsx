import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useActiveAccount } from "thirdweb/react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Wallet, TrendingUp, Clock, ClipboardList, Loader2, Shield, Gift, ExternalLink, Timer, RefreshCw, Coins } from "lucide-react";
import { getOrdersByWallet, getEarnings, getRewardsByWallet, redeemMaturedOrder, reinvestMaturedOrder } from "@/lib/api";
import { t, getLang, translateProductName } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "earnings">("orders");
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "completed">("all");
  const [redeemTarget, setRedeemTarget] = useState<any | null>(null);
  const [reinvestTarget, setReinvestTarget] = useState<any | null>(null);
  const account = useActiveAccount();
  const address = account?.address?.toLowerCase();
  const lang = getLang();
  const queryClient = useQueryClient();


  const redeemMutation = useMutation({
    mutationFn: (orderId: number) => redeemMaturedOrder(address!, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/earnings", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards", address] });
      setRedeemTarget(null);
    },
  });

  const reinvestMutation = useMutation({
    mutationFn: (orderId: number) => reinvestMaturedOrder(address!, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/earnings", address] });
      setReinvestTarget(null);
    },
  });

  const { data: orderList = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders", address],
    queryFn: () => getOrdersByWallet(address!),
    enabled: !!address,
  });

  const { data: earningsData } = useQuery({
    queryKey: ["/api/earnings", address],
    queryFn: () => getEarnings(address!),
    enabled: !!address,
  });

  const { data: rewardList = [], isLoading: rewardsLoading } = useQuery({
    queryKey: ["/api/rewards", address],
    queryFn: () => getRewardsByWallet(address!),
    enabled: !!address,
  });

  const totalEarnings = parseFloat((earningsData as any)?.totalEarnings || "0");

  // Product/daily earnings + principal redemption records
  const dailyRewards = (rewardList as any[]).filter((r: any) => r.type === "daily" || r.type === "principal_return");

  // Today's daily earnings only (excludes principal redemptions)
  const today = new Date().toDateString();
  const todayDailyEarnings = dailyRewards
    .filter((r: any) => r.type === "daily" && new Date(r.createdAt).toDateString() === today)
    .reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0);

  if (!account) {
    return (
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-base">{t("orders.title")}</h2>
        </div>
        <div className="text-center py-16 text-muted-foreground">
          <Wallet size={40} className="mx-auto mb-3 opacity-30" />
          <p>{t("orders.connect_wallet")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-base">{t("orders.title")}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} style={{ color: "#E8C547" }} />
            <span className="text-[10px] text-muted-foreground">{t("orders.daily_income")}</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#E8C547" }}>
            {todayDailyEarnings.toFixed(6)}
          </div>
          <div className="text-[10px] text-muted-foreground">USDT</div>
        </div>
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} style={{ color: "#C9A227" }} />
            <span className="text-[10px] text-muted-foreground">{t("orders.total_income")}</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#C9A227" }}>
            {totalEarnings.toFixed(6)}
          </div>
          <div className="text-[10px] text-muted-foreground">USDT</div>
        </div>
      </div>

      <div className="flex rounded-lg p-1 gap-1" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
        {(["orders", "earnings"] as const).map(tab => (
          <button
            key={tab}
            data-testid={`tab-${tab}`}
            className="flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200"
            style={activeTab === tab
              ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
              : { color: "rgba(255,255,255,0.5)" }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "orders" ? t("orders.tab_orders") : t("orders.earnings_detail")}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="space-y-3">
          {/* Order status filter */}
          <div className="flex rounded-lg p-1 gap-1" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.1)" }}>
            {([
              { key: "all" as const, label: t("orders.all") },
              { key: "active" as const, label: t("orders.active") },
              { key: "completed" as const, label: t("orders.completed") },
            ]).map(({ key, label }) => (
              <button key={key}
                className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-all"
                style={orderFilter === key
                  ? { background: "rgba(201,162,39,0.12)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }
                  : { color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}
                onClick={() => setOrderFilter(key)}>
                {label}
              </button>
            ))}
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
            </div>
          ) : (orderList as any[]).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
              <p>{t("orders.no_orders")}</p>
            </div>
          ) : (
            (orderList as any[]).filter((order: any) => {
              if (orderFilter === "all") return true;
              if (orderFilter === "active") return order.status === "active" || order.status === "matured";
              // completed bucket: historical / terminal states
              return order.status === "completed" || order.status === "redeemed" || order.status === "reinvested";
            }).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
              <p>{t("orders.no_orders")}</p>
            </div>
          ) : (
            (orderList as any[]).filter((order: any) => {
              if (orderFilter === "all") return true;
              if (orderFilter === "active") return order.status === "active" || order.status === "matured";
              return order.status === "completed" || order.status === "redeemed" || order.status === "reinvested";
            }).map((order: any) => {
              const endDate = new Date(order.endDate);
              const now = new Date();
              const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
              const isMatured = order.status === "matured";
              const statusLabel = order.status === "active"
                ? t("orders.staking")
                : order.status === "matured"
                ? t("orders.matured")
                : order.status === "redeemed"
                ? t("orders.redeemed")
                : order.status === "reinvested"
                ? t("orders.reinvested")
                : t("orders.expired");
              const statusStyle = order.status === "active"
                ? { background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }
                : order.status === "matured"
                ? { background: "rgba(232,197,71,0.18)", color: "#E8C547", border: "1px solid rgba(232,197,71,0.4)" }
                : { background: "rgba(100,200,100,0.1)", color: "#6bc46b", border: "1px solid rgba(100,200,100,0.2)" };
              return (
                <div
                  key={order.id}
                  data-testid={`card-order-${order.id}`}
                  className="product-card rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-foreground">{translateProductName(order.productName)}</div>
                      <div className="text-xs text-muted-foreground">Order #{order.id}</div>
                    </div>
                    <Badge style={statusStyle}>{statusLabel}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">{t("orders.principal")}</div>
                      <div className="text-sm font-bold text-foreground">{parseFloat(order.amount).toFixed(0)} U</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">{t("orders.daily_interest")}</div>
                      <div className="text-sm font-bold" style={{ color: "#E8C547" }}>
                        +{(parseFloat(order.amount) * parseFloat(order.dailyRate) / 100).toFixed(6)} U
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">{t("orders.total_earned")}</div>
                      <div className="text-sm font-bold" style={{ color: "#C9A227" }}>+{parseFloat(order.totalEarned).toFixed(6)} U</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">
                        {order.status === "active"
                          ? t("orders.days_left")
                          : t("orders.status")}
                      </div>
                      <div className="text-sm font-bold" style={{ color: isMatured ? "#E8C547" : undefined }}>
                        {order.status === "active"
                          ? `${daysLeft} ${t("common.days")}`
                          : statusLabel}
                      </div>
                    </div>
                  </div>

                  {isMatured && (
                    <div
                      className="rounded-lg p-3 space-y-2"
                      style={{
                        background: "rgba(232,197,71,0.08)",
                        border: "1px solid rgba(232,197,71,0.25)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#E8C547" }}>
                        <Timer size={12} />
                        <span>{t("orders.matured_choose")}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          data-testid={`button-reinvest-${order.id}`}
                          onClick={() => setReinvestTarget(order)}
                          className="flex-1 py-2 rounded-md text-sm font-bold transition-all"
                          style={{
                            background: "linear-gradient(135deg, #22c55e, #16a34a)",
                            color: "#fff",
                          }}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <RefreshCw size={14} />
                            {t("orders.reinvest_now")}
                          </span>
                        </button>
                        <button
                          data-testid={`button-redeem-${order.id}`}
                          onClick={() => setRedeemTarget(order)}
                          className="flex-1 py-2 rounded-md text-sm font-bold transition-all"
                          style={{
                            background: "linear-gradient(135deg, #C9A227, #9A7A1A)",
                            color: "#0c0a08",
                          }}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Coins size={14} />
                            {t("orders.redeem_now")}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {order.status === "reinvested" && (
                    <div
                      className="flex items-center gap-1.5 text-xs rounded-md px-2 py-1.5"
                      style={{
                        background: "rgba(100,200,100,0.08)",
                        color: "#6bc46b",
                        border: "1px solid rgba(100,200,100,0.2)",
                      }}
                    >
                      <RefreshCw size={11} />
                      <span>{t("orders.reinvested_note")}</span>
                    </div>
                  )}

                  {order.reinvestedFromOrderId && (
                    <div
                      className="flex items-center gap-1.5 text-xs rounded-md px-2 py-1.5"
                      style={{
                        background: "rgba(201,162,39,0.08)",
                        color: "#C9A227",
                        border: "1px solid rgba(201,162,39,0.2)",
                      }}
                    >
                      <RefreshCw size={11} />
                      <span>{t("orders.reinvested_from").replace("{id}", String(order.reinvestedFromOrderId))}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs px-1" style={{ color: "rgba(201,162,39,0.5)" }}>
                    <span>{t("orders.daily_rate")}: {order.dailyRate}%</span>
                    <span>{t("orders.total_days")}: {order.days}{t("common.days")}</span>
                    <span>{t("orders.est_total")}: {(parseFloat(order.amount) * parseFloat(order.dailyRate) / 100 * order.days).toFixed(6)} U</span>
                  </div>

                  <div className="pt-2 border-t" style={{ borderColor: "rgba(201,162,39,0.12)" }}>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t("orders.start")}: {new Date(order.startDate).toLocaleDateString()}</span>
                      <span>{t("orders.end")}: {endDate.toLocaleDateString()}</span>
                    </div>
                    {order.txHash && (
                      <a
                        href={`https://bscscan.com/tx/${order.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-1.5 text-xs"
                        style={{ color: "#C9A227" }}
                      >
                        <ExternalLink size={10} />
                        <span>View on BscScan</span>
                      </a>
                    )}
                    {order.status === "active" && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: "rgba(201,162,39,0.6)" }}>
                        <Shield size={10} />
                        <span>{t("orders.no_redeem")}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ))}
        </div>
      )}

      {/* Earnings Tab - only product/daily earnings */}
      {activeTab === "earnings" && (
        <div className="space-y-2">
          {rewardsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
            </div>
          ) : dailyRewards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift size={40} className="mx-auto mb-3 opacity-30" />
              <p>{t("reward.no_records")}</p>
            </div>
          ) : (
            dailyRewards.map((r: any) => {
              const isPrincipal = r.type === "principal_return";
              const dotColor = isPrincipal ? "#6bc46b" : "#E8C547";
              const label = isPrincipal ? t("reward.principal_return") : t("reward.daily");
              return (
              <div
                key={r.id}
                className="product-card rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
                    <span className="text-sm font-semibold" style={{ color: dotColor }}>
                      {label}
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: isPrincipal ? "#6bc46b" : "#C9A227" }}>
                    +{parseFloat(r.amount).toFixed(6)} U
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {r.productName && (
                    <>
                      <span className="text-muted-foreground">{t("reward.product")}</span>
                      <span className="text-right">{translateProductName(r.productName)}</span>
                    </>
                  )}
                  {r.orderAmount && (
                    <>
                      <span className="text-muted-foreground">{t("reward.order_amount")}</span>
                      <span className="text-right">{parseFloat(r.orderAmount).toFixed(0)} U</span>
                    </>
                  )}
                  <span className="text-muted-foreground">{t("reward.time")}</span>
                  <span className="text-right">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
              </div>
              );
            })
          )}
        </div>
      )}

      {/* Redemption confirmation dialog */}
      <Dialog open={!!redeemTarget} onOpenChange={(open) => !open && setRedeemTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins size={18} style={{ color: "#C9A227" }} />
              {t("orders.redeem_confirm_title")}
            </DialogTitle>
            <DialogDescription className="text-left leading-relaxed">
              {t("orders.redeem_explain")}
            </DialogDescription>
          </DialogHeader>

          {redeemTarget && (
            <div
              className="rounded-lg p-3 space-y-2 text-sm"
              style={{
                background: "rgba(201,162,39,0.08)",
                border: "1px solid rgba(201,162,39,0.2)",
              }}
            >
              <div className="flex justify-between">
                <span className="text-muted-foreground">{translateProductName(redeemTarget.productName)}</span>
                <span className="text-muted-foreground">#{redeemTarget.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("orders.principal")}</span>
                <span className="font-bold" style={{ color: "#C9A227" }}>
                  {parseFloat(redeemTarget.amount).toFixed(2)} USDT
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setRedeemTarget(null)}
              disabled={redeemMutation.isPending}
              data-testid="button-redeem-cancel"
            >
              {t("orders.cancel")}
            </Button>
            <Button
              onClick={() => redeemTarget && redeemMutation.mutate(redeemTarget.id)}
              disabled={redeemMutation.isPending}
              data-testid="button-redeem-confirm"
              style={{
                background: "linear-gradient(135deg, #C9A227, #9A7A1A)",
                color: "#0c0a08",
              }}
            >
              {redeemMutation.isPending ? (
                <Loader2 size={14} className="animate-spin mr-1" />
              ) : null}
              {t("orders.confirm")}
            </Button>
          </DialogFooter>

          {redeemMutation.isError && (
            <div className="text-xs text-red-400 mt-2">
              {t("orders.redeem_failed")}: {(redeemMutation.error as any)?.message || ""}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reinvest confirmation dialog */}
      <Dialog open={!!reinvestTarget} onOpenChange={(open) => !open && setReinvestTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw size={18} style={{ color: "#22c55e" }} />
              {t("orders.reinvest_confirm_title")}
            </DialogTitle>
            <DialogDescription className="text-left leading-relaxed">
              {t("orders.reinvest_explain")}
            </DialogDescription>
          </DialogHeader>

          {reinvestTarget && (
            <div
              className="rounded-lg p-3 space-y-2 text-sm"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <div className="flex justify-between">
                <span className="text-muted-foreground">{translateProductName(reinvestTarget.productName)}</span>
                <span className="text-muted-foreground">#{reinvestTarget.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("orders.principal")}</span>
                <span className="font-bold" style={{ color: "#22c55e" }}>
                  {parseFloat(reinvestTarget.amount).toFixed(2)} USDT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("orders.total_days")}</span>
                <span className="font-bold" style={{ color: "#22c55e" }}>
                  {reinvestTarget.days} {t("common.days")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("orders.daily_rate")}</span>
                <span className="font-bold" style={{ color: "#22c55e" }}>
                  {reinvestTarget.dailyRate}%
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setReinvestTarget(null)}
              disabled={reinvestMutation.isPending}
              data-testid="button-reinvest-cancel"
            >
              {t("orders.cancel")}
            </Button>
            <Button
              onClick={() => reinvestTarget && reinvestMutation.mutate(reinvestTarget.id)}
              disabled={reinvestMutation.isPending}
              data-testid="button-reinvest-confirm"
              style={{
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "#fff",
              }}
            >
              {reinvestMutation.isPending ? (
                <Loader2 size={14} className="animate-spin mr-1" />
              ) : null}
              {t("orders.reinvest_now")}
            </Button>
          </DialogFooter>

          {reinvestMutation.isError && (
            <div className="text-xs text-red-400 mt-2">
              {t("orders.reinvest_failed")}: {(reinvestMutation.error as any)?.message || ""}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
