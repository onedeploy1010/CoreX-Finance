import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveAccount } from "thirdweb/react";
import { Wallet, TrendingUp, Clock, CheckCircle, ChevronRight, ArrowDownToLine, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MOCK_ORDERS = [
  {
    id: "ORD001",
    product: "CX Peak 01",
    productCn: "芯未来",
    amount: 500,
    dailyRate: 0.3,
    days: 30,
    startDate: "2026-02-01",
    endDate: "2026-03-03",
    status: "active",
    earned: 45,
    daysLeft: 0,
  },
  {
    id: "ORD002",
    product: "CX Flash 01",
    productCn: "芯未来1号",
    amount: 1000,
    dailyRate: 0.41,
    days: 120,
    startDate: "2026-01-15",
    endDate: "2026-05-15",
    status: "active",
    earned: 197.6,
    daysLeft: 73,
  },
  {
    id: "ORD003",
    product: "CX Peak 01",
    productCn: "芯未来",
    amount: 300,
    dailyRate: 0.3,
    days: 30,
    startDate: "2025-12-01",
    endDate: "2025-12-31",
    status: "completed",
    earned: 27,
    daysLeft: 0,
  },
];

const MOCK_REWARDS = [
  { id: "RWD001", type: "直推奖励", from: "0x742d...F3a2", amount: 1.23, date: "2026-03-02" },
  { id: "RWD002", type: "间推奖励", from: "0x9f3c...B891", amount: 0.41, date: "2026-03-01" },
  { id: "RWD003", type: "团队奖励", from: "V3收益", amount: 8.75, date: "2026-03-01" },
  { id: "RWD004", type: "直推奖励", from: "0x1a2b...C543", amount: 2.05, date: "2026-02-28" },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "rewards">("orders");
  const account = useActiveAccount();
  const { toast } = useToast();

  const totalEarned = MOCK_ORDERS.reduce((sum, o) => sum + o.earned, 0);
  const withdrawable = MOCK_ORDERS
    .filter(o => o.status === "active" || o.status === "completed")
    .reduce((sum, o) => sum + (o.daysLeft === 0 && o.status === "active" ? o.earned : o.status === "completed" ? o.earned : 0), 0);

  const handleWithdraw = () => {
    if (!account) {
      toast({ title: "请先连接钱包", variant: "destructive" });
      return;
    }
    toast({ title: "提现申请已提交", description: "预计24小时内到账" });
  };

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
          <div className="font-black text-lg" style={{ color: "#C9A227" }}>
            {totalEarned.toFixed(6)}
          </div>
          <div className="text-xs text-muted-foreground">USDT</div>
        </div>
        <div className="stat-card rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} style={{ color: "#E8C547" }} />
            <span className="text-xs text-muted-foreground">可提现收益</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#E8C547" }}>
            {withdrawable.toFixed(6)}
          </div>
          <div className="text-xs text-muted-foreground">USDT</div>
        </div>
      </div>

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
          {MOCK_ORDERS.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
              <p>暂无订单</p>
            </div>
          ) : (
            MOCK_ORDERS.map((order) => (
              <div
                key={order.id}
                data-testid={`card-order-${order.id}`}
                className="product-card rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm text-foreground">{order.product}</div>
                    <div className="text-xs text-muted-foreground">{order.productCn} · {order.id}</div>
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
                    <div className="text-sm font-bold text-foreground">{order.amount} U</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-0.5">累计收益</div>
                    <div className="text-sm font-bold" style={{ color: "#C9A227" }}>+{order.earned.toFixed(2)} U</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-0.5">剩余天数</div>
                    <div className="text-sm font-bold text-foreground">{order.daysLeft} 天</div>
                  </div>
                </div>

                <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground" style={{ borderColor: "rgba(201,162,39,0.12)" }}>
                  <span>开始: {order.startDate}</span>
                  <span>到期: {order.endDate}</span>
                </div>

                {order.status === "active" && order.daysLeft === 0 && (
                  <Button
                    data-testid={`button-claim-${order.id}`}
                    size="sm"
                    className="w-full font-bold text-xs"
                    style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
                    onClick={handleWithdraw}
                  >
                    <CheckCircle size={12} className="mr-1" />
                    赎回本金 + 收益
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "rewards" && (
        <div className="space-y-3">
          {MOCK_REWARDS.map((reward) => (
            <div
              key={reward.id}
              data-testid={`card-reward-${reward.id}`}
              className="product-card rounded-xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.25)" }}>
                  <ChevronRight size={14} style={{ color: "#C9A227" }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{reward.type}</div>
                  <div className="text-xs text-muted-foreground">{reward.from} · {reward.date}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm" style={{ color: "#C9A227" }}>+{reward.amount}</div>
                <div className="text-xs text-muted-foreground">USDT</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
