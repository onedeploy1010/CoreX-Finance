import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useActiveAccount } from "thirdweb/react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Clock, ClipboardList, Loader2, Shield, Gift } from "lucide-react";
import { getOrdersByWallet, getEarnings, getRewardsByWallet } from "@/lib/api";
import { t, getLang } from "@/lib/i18n";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "earnings">("orders");
  const account = useActiveAccount();
  const address = account?.address?.toLowerCase();
  const lang = getLang();

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

  // Only product/daily earnings
  const dailyRewards = (rewardList as any[]).filter((r: any) => r.type === "daily");

  // Today's daily earnings only
  const today = new Date().toDateString();
  const todayDailyEarnings = dailyRewards
    .filter((r: any) => new Date(r.createdAt).toDateString() === today)
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
            <span className="text-[10px] text-muted-foreground">日收益</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#E8C547" }}>
            {todayDailyEarnings.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted-foreground">USDT</div>
        </div>
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} style={{ color: "#C9A227" }} />
            <span className="text-[10px] text-muted-foreground">总收益</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#C9A227" }}>
            {totalEarnings.toFixed(2)}
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
            {tab === "orders" ? t("orders.tab_orders") : "收益明细"}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="space-y-3">
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
            (orderList as any[]).map((order: any) => {
              const endDate = new Date(order.endDate);
              const now = new Date();
              const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <div
                  key={order.id}
                  data-testid={`card-order-${order.id}`}
                  className="product-card rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-foreground">{order.productName}</div>
                      <div className="text-xs text-muted-foreground">Order #{order.id}</div>
                    </div>
                    <Badge
                      style={order.status === "active"
                        ? { background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }
                        : { background: "rgba(100,200,100,0.1)", color: "#6bc46b", border: "1px solid rgba(100,200,100,0.2)" }}
                    >
                      {order.status === "active" ? t("orders.staking") : t("orders.expired")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">{t("orders.principal")}</div>
                      <div className="text-sm font-bold text-foreground">{parseFloat(order.amount).toFixed(0)} U</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">{t("orders.daily_interest")}</div>
                      <div className="text-sm font-bold" style={{ color: "#E8C547" }}>
                        +{(parseFloat(order.amount) * parseFloat(order.dailyRate) / 100).toFixed(2)} U
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">{t("orders.total_earned")}</div>
                      <div className="text-sm font-bold" style={{ color: "#C9A227" }}>+{parseFloat(order.totalEarned).toFixed(2)} U</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">
                        {order.status === "active" ? t("orders.days_left") : t("orders.status")}
                      </div>
                      <div className="text-sm font-bold text-foreground">
                        {order.status === "active" ? `${daysLeft} ${t("common.days")}` : t("orders.principal_returned")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs px-1" style={{ color: "rgba(201,162,39,0.5)" }}>
                    <span>{t("orders.daily_rate")}: {order.dailyRate}%</span>
                    <span>{t("orders.total_days")}: {order.days}{t("common.days")}</span>
                    <span>{t("orders.est_total")}: {(parseFloat(order.amount) * parseFloat(order.dailyRate) / 100 * order.days).toFixed(2)} U</span>
                  </div>

                  <div className="pt-2 border-t" style={{ borderColor: "rgba(201,162,39,0.12)" }}>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t("orders.start")}: {new Date(order.startDate).toLocaleDateString()}</span>
                      <span>{t("orders.end")}: {endDate.toLocaleDateString()}</span>
                    </div>
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
          )}
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
            dailyRewards.map((r: any) => (
              <div
                key={r.id}
                className="product-card rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: "#E8C547" }} />
                    <span className="text-sm font-semibold" style={{ color: "#E8C547" }}>
                      {t("reward.daily")}
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#C9A227" }}>
                    +{parseFloat(r.amount).toFixed(2)} U
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {r.productName && (
                    <>
                      <span className="text-muted-foreground">{t("reward.product")}</span>
                      <span className="text-right">{r.productName}</span>
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
