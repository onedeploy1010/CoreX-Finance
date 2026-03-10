import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useActiveAccount } from "thirdweb/react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Clock, ArrowDownToLine, ClipboardList, Loader2, AlertCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WITHDRAW_MIN, WITHDRAW_FEE } from "@shared/schema";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "withdrawals">("orders");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
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

  const { data: withdrawalList = [], isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["/api/withdrawals", address],
    enabled: !!address,
  });

  const availableBalance = parseFloat((earningsData as any)?.availableBalance || "0");
  const totalWithdrawn = parseFloat((earningsData as any)?.totalWithdrawn || "0");
  const totalDailyEarnings = parseFloat((earningsData as any)?.dailyRewards || "0");

  const handleWithdraw = async () => {
    if (!account) {
      toast({ title: "请先连接钱包", variant: "destructive" });
      return;
    }
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < WITHDRAW_MIN) {
      toast({ title: `最低提现金额 ${WITHDRAW_MIN} USDT`, variant: "destructive" });
      return;
    }
    if (amt > availableBalance) {
      toast({ title: "可提现余额不足", variant: "destructive" });
      return;
    }
    setWithdrawLoading(true);
    try {
      await apiRequest("POST", "/api/withdrawals", {
        walletAddress: account.address,
        amount: withdrawAmount,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/earnings", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals", address] });
      toast({ title: "提现申请已提交", description: `提现 ${amt} USDT，手续费 ${WITHDRAW_FEE} USDT，实际到账 ${(amt - WITHDRAW_FEE).toFixed(2)} USDT` });
      setWithdrawOpen(false);
      setWithdrawAmount("");
    } catch (err: any) {
      toast({ title: "提现失败", description: err.message, variant: "destructive" });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const getWithdrawStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }}>处理中</Badge>;
      case "completed":
        return <Badge style={{ background: "rgba(100,200,100,0.1)", color: "#6bc46b", border: "1px solid rgba(100,200,100,0.2)" }}>已完成</Badge>;
      case "rejected":
        return <Badge style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>已拒绝</Badge>;
      default:
        return <Badge>{status}</Badge>;
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

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet size={12} style={{ color: "#C9A227" }} />
            <span className="text-[10px] text-muted-foreground">可提现</span>
          </div>
          <div className="font-black text-base" data-testid="text-available-balance" style={{ color: "#C9A227" }}>
            {availableBalance.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted-foreground">USDT</div>
        </div>
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} style={{ color: "#E8C547" }} />
            <span className="text-[10px] text-muted-foreground">累计日收益</span>
          </div>
          <div className="font-black text-base" style={{ color: "#E8C547" }}>
            {totalDailyEarnings.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted-foreground">USDT</div>
        </div>
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownToLine size={12} style={{ color: "#6bc46b" }} />
            <span className="text-[10px] text-muted-foreground">已提现</span>
          </div>
          <div className="font-black text-base" data-testid="text-total-withdrawn" style={{ color: "#6bc46b" }}>
            {totalWithdrawn.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted-foreground">USDT</div>
        </div>
      </div>

      <Button
        data-testid="button-withdraw-now"
        className="w-full font-bold text-sm"
        style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
        onClick={() => setWithdrawOpen(true)}
      >
        <ArrowDownToLine size={14} className="mr-1.5" />
        立即提现
      </Button>

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
          data-testid="tab-withdraw-history"
          className="flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200"
          style={activeTab === "withdrawals"
            ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
            : { color: "rgba(255,255,255,0.5)" }}
          onClick={() => setActiveTab("withdrawals")}
        >
          提现记录
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
                      <div className="text-xs text-muted-foreground">Order #{order.id}</div>
                    </div>
                    <Badge
                      style={order.status === "active"
                        ? { background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }
                        : { background: "rgba(100,200,100,0.1)", color: "#6bc46b", border: "1px solid rgba(100,200,100,0.2)" }}
                    >
                      {order.status === "active" ? "质押中" : "已到期"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">投资本金</div>
                      <div className="text-sm font-bold text-foreground">{parseFloat(order.amount).toFixed(0)} U</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">每日利息</div>
                      <div className="text-sm font-bold" style={{ color: "#E8C547" }}>
                        +{(parseFloat(order.amount) * parseFloat(order.dailyRate) / 100).toFixed(2)} U
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">累计收益</div>
                      <div className="text-sm font-bold" style={{ color: "#C9A227" }}>+{parseFloat(order.totalEarned).toFixed(2)} U</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">
                        {order.status === "active" ? "剩余天数" : "状态"}
                      </div>
                      <div className="text-sm font-bold text-foreground">
                        {order.status === "active" ? `${daysLeft} 天` : "本金已返还"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs px-1" style={{ color: "rgba(201,162,39,0.5)" }}>
                    <span>日利率: {order.dailyRate}%</span>
                    <span>总天数: {order.days}天</span>
                    <span>预计总收益: {(parseFloat(order.amount) * parseFloat(order.dailyRate) / 100 * order.days).toFixed(2)} U</span>
                  </div>

                  <div className="pt-2 border-t" style={{ borderColor: "rgba(201,162,39,0.12)" }}>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>开始: {new Date(order.startDate).toLocaleDateString()}</span>
                      <span>到期: {endDate.toLocaleDateString()}</span>
                    </div>
                    {order.status === "active" && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: "rgba(201,162,39,0.6)" }}>
                        <Shield size={10} />
                        <span>不可提前赎回 · 到期自动返还本金</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "withdrawals" && (
        <div className="space-y-3">
          {withdrawalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
            </div>
          ) : (withdrawalList as any[]).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowDownToLine size={40} className="mx-auto mb-3 opacity-30" />
              <p>暂无提现记录</p>
            </div>
          ) : (
            (withdrawalList as any[]).map((w: any) => (
              <div
                key={w.id}
                data-testid={`card-withdrawal-${w.id}`}
                className="product-card rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground">提现 #{w.id}</div>
                  {getWithdrawStatusBadge(w.status)}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">提现金额</div>
                    <div className="text-xs font-bold text-foreground">{parseFloat(w.amount).toFixed(2)} U</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">手续费</div>
                    <div className="text-xs font-bold" style={{ color: "#ef4444" }}>-{parseFloat(w.fee).toFixed(2)} U</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">实际到账</div>
                    <div className="text-xs font-bold" style={{ color: "#C9A227" }}>{parseFloat(w.actualAmount).toFixed(2)} U</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent
          className="max-w-sm mx-auto"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>
              提现
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              日利润可随时提现 · 本金到期自动返还
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg p-3 text-center" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
              <div className="text-xs text-muted-foreground mb-1">可提现余额</div>
              <div className="font-black text-2xl" style={{ color: "#C9A227" }}>{availableBalance.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">USDT</div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">提现金额 (USDT)</label>
              <div className="relative">
                <Input
                  data-testid="input-withdraw-amount"
                  type="number"
                  placeholder={`最低 ${WITHDRAW_MIN} USDT`}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pr-16"
                  style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.25)", color: "#f5e6b8" }}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227" }}
                  onClick={() => setWithdrawAmount(availableBalance.toFixed(2))}
                >
                  全部
                </button>
              </div>
            </div>

            {parseFloat(withdrawAmount) > 0 && (
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">提现金额</span>
                  <span className="text-foreground">{parseFloat(withdrawAmount).toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">手续费</span>
                  <span style={{ color: "#ef4444" }}>-{WITHDRAW_FEE} USDT</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-1 border-t" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
                  <span className="text-muted-foreground">实际到账</span>
                  <span style={{ color: "#C9A227" }}>{(parseFloat(withdrawAmount) - WITHDRAW_FEE).toFixed(2)} USDT</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle size={11} style={{ color: "#C9A227" }} />
                <span>最低提现金额: {WITHDRAW_MIN} USDT</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle size={11} style={{ color: "#C9A227" }} />
                <span>手续费: 每笔 {WITHDRAW_FEE} USDT</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield size={11} style={{ color: "#C9A227" }} />
                <span>仅可提取日利润及奖励，本金到期自动返还</span>
              </div>
            </div>

            <Button
              data-testid="button-confirm-withdraw"
              className="w-full font-bold text-sm"
              disabled={withdrawLoading || parseFloat(withdrawAmount || "0") < WITHDRAW_MIN}
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              onClick={handleWithdraw}
            >
              {withdrawLoading ? "处理中..." : "确认提现"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
