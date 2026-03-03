import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveAccount } from "thirdweb/react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Clock, CheckCircle, ChevronRight, ArrowDownToLine, ClipboardList, Loader2, Award, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "rewards">("orders");
  const account = useActiveAccount();
  const { toast } = useToast();
  const address = account?.address?.toLowerCase();

  const { data: orderList = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders", address],
    enabled: !!address,
  });

  const { data: earningsData } = useQuery({
    queryKey: ["/api/earnings", address],
    enabled: !!address,
  });

  const { data: rewardList = [], isLoading: rewardsLoading } = useQuery({
    queryKey: ["/api/rewards", address],
    enabled: !!address,
  });

  const totalEarned = earningsData?.totalEarnings || "0";
  const totalRewards = earningsData?.totalRewards || "0";

  const handleWithdraw = () => {
    if (!account) {
      toast({ title: "请先连接钱包", variant: "destructive" });
      return;
    }
    toast({ title: "提现申请已提交", description: "预计24小时内到账" });
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "daily": return <TrendingUp size={14} style={{ color: "#C9A227" }} />;
      case "direct_referral": return <Users size={14} style={{ color: "#E8C547" }} />;
      case "indirect_referral": return <ChevronRight size={14} style={{ color: "#D4A832" }} />;
      case "team_bonus": return <Award size={14} style={{ color: "#FFD700" }} />;
      default: return <ChevronRight size={14} style={{ color: "#C9A227" }} />;
    }
  };

  const getRewardLabel = (type: string) => {
    switch (type) {
      case "daily": return "每日收益";
      case "direct_referral": return "直推奖励";
      case "indirect_referral": return "间推奖励";
      case "team_bonus": return "团队奖励";
      default: return type;
    }
  };

  if (!account) {
    return (
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-base">我的订单</h2>
        </div>
        <div className="text-center py-16 text-muted-foreground">
          <Wallet size={40} className="mx-auto mb-3 opacity-30" />
          <p>请先连接钱包查看订单</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-base">我的订单</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Wallet size={14} style={{ color: "#C9A227" }} />
            <span className="text-xs text-muted-foreground">累计收益</span>
          </div>
          <div className="font-black text-lg" data-testid="text-total-earnings" style={{ color: "#C9A227" }}>
            {parseFloat(totalEarned).toFixed(6)}
          </div>
          <div className="text-xs text-muted-foreground">USDT</div>
        </div>
        <div className="stat-card rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} style={{ color: "#E8C547" }} />
            <span className="text-xs text-muted-foreground">总奖励收入</span>
          </div>
          <div className="font-black text-lg" data-testid="text-total-rewards" style={{ color: "#E8C547" }}>
            {parseFloat(totalRewards).toFixed(6)}
          </div>
          <div className="text-xs text-muted-foreground">USDT</div>
        </div>
      </div>

      {earningsData && (
        <div className="grid grid-cols-3 gap-2">
          <div className="stat-card rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-muted-foreground">直推奖励</div>
            <div className="font-bold text-xs" style={{ color: "#E8C547" }}>{parseFloat(earningsData.directRewards || "0").toFixed(2)}</div>
          </div>
          <div className="stat-card rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-muted-foreground">间推奖励</div>
            <div className="font-bold text-xs" style={{ color: "#D4A832" }}>{parseFloat(earningsData.indirectRewards || "0").toFixed(2)}</div>
          </div>
          <div className="stat-card rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-muted-foreground">团队奖励</div>
            <div className="font-bold text-xs" style={{ color: "#FFD700" }}>{parseFloat(earningsData.teamRewards || "0").toFixed(2)}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          data-testid="button-withdraw-history"
          variant="outline"
          className="w-full font-semibold text-sm"
          style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.3)", color: "#C9A227" }}
        >
          <Clock size={14} className="mr-1.5" />
          提现记录
        </Button>
        <Button
          data-testid="button-withdraw-now"
          className="w-full font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
          onClick={handleWithdraw}
        >
          <ArrowDownToLine size={14} className="mr-1.5" />
          立即提现
        </Button>
      </div>

      <div className="flex rounded-lg p-1 gap-1" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
        <button
          data-testid="tab-my-orders"
          className="flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200"
          style={activeTab === "orders"
            ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
            : { color: "rgba(255,255,255,0.5)" }}
          onClick={() => setActiveTab("orders")}
        >
          我的订单
        </button>
        <button
          data-testid="tab-reward-detail"
          className="flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200"
          style={activeTab === "rewards"
            ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
            : { color: "rgba(255,255,255,0.5)" }}
          onClick={() => setActiveTab("rewards")}
        >
          奖励明细
        </button>
      </div>

      {activeTab === "orders" && (
        <div className="space-y-3">
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
            </div>
          ) : (orderList as any[]).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
              <p>暂无订单</p>
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
                      <div className="text-xs text-muted-foreground">订单 #{order.id}</div>
                    </div>
                    <Badge
                      style={order.status === "active"
                        ? { background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }
                        : { background: "rgba(100,200,100,0.1)", color: "#6bc46b", border: "1px solid rgba(100,200,100,0.2)" }}
                    >
                      {order.status === "active" ? "质押中" : "已完成"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">投资本金</div>
                      <div className="text-sm font-bold text-foreground">{parseFloat(order.amount).toFixed(0)} U</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">累计收益</div>
                      <div className="text-sm font-bold" style={{ color: "#C9A227" }}>+{parseFloat(order.totalEarned).toFixed(2)} U</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">剩余天数</div>
                      <div className="text-sm font-bold text-foreground">{daysLeft} 天</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground" style={{ borderColor: "rgba(201,162,39,0.12)" }}>
                    <span>开始: {new Date(order.startDate).toLocaleDateString()}</span>
                    <span>到期: {endDate.toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "rewards" && (
        <div className="space-y-3">
          {rewardsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
            </div>
          ) : (rewardList as any[]).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award size={40} className="mx-auto mb-3 opacity-30" />
              <p>暂无奖励记录</p>
            </div>
          ) : (
            (rewardList as any[]).map((reward: any) => (
              <div
                key={reward.id}
                data-testid={`card-reward-${reward.id}`}
                className="product-card rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.25)" }}>
                    {getRewardIcon(reward.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{getRewardLabel(reward.type)}</div>
                    <div className="text-xs text-muted-foreground truncate">{reward.description || ""}</div>
                    <div className="text-xs text-muted-foreground">{new Date(reward.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm" style={{ color: "#C9A227" }}>+{parseFloat(reward.amount).toFixed(4)}</div>
                  <div className="text-xs text-muted-foreground">USDT</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
