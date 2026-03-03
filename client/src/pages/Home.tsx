import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useActiveAccount } from "thirdweb/react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Clock, DollarSign, Shield } from "lucide-react";
import { PRODUCTS } from "@shared/schema";

interface Product {
  id: number;
  name: string;
  nameEn: string;
  days: number;
  dailyRate: number;
  minAmount: number;
  description: string;
}

const COLORS = ["#C9A227", "#E8C547", "#D4A832", "#C9A227", "#E8C547"];

function InvestDialog({ product, open, onClose, color }: { product: Product | null; open: boolean; onClose: () => void; color: string }) {
  const [amount, setAmount] = useState("");
  const account = useActiveAccount();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!product) return null;

  const totalReturn = product.days * product.dailyRate / 100;
  const estimatedProfit = parseFloat(amount || "0") * totalReturn;

  const handleInvest = async () => {
    if (!account) {
      toast({ title: "请先连接钱包", variant: "destructive" });
      return;
    }
    if (!amount || parseFloat(amount) < product.minAmount) {
      toast({ title: `最低投入 ${product.minAmount} USDT`, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/orders", {
        walletAddress: account.address,
        productId: product.id,
        amount: amount,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", account.address.toLowerCase()] });
      queryClient.invalidateQueries({ queryKey: ["/api/earnings", account.address.toLowerCase()] });
      queryClient.invalidateQueries({ queryKey: ["/api/members", account.address.toLowerCase()] });
      queryClient.invalidateQueries({ queryKey: ["/api/members", account.address.toLowerCase(), "team-stats"] });
      toast({ title: "投资成功", description: `已质押 ${amount} USDT 到 ${product.name}` });
      onClose();
      setAmount("");
    } catch (err: any) {
      toast({ title: "投资失败", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-sm mx-auto"
        style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-center" style={{ color }}>
            {product.name}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            {product.description} · {product.days}天周期 · 日利率{product.dailyRate}%
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">投资周期</div>
              <div className="font-bold" style={{ color }}>{product.days} 天</div>
            </div>
            <div className="stat-card rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">日利率</div>
              <div className="font-bold" style={{ color }}>{product.dailyRate}%</div>
            </div>
            <div className="stat-card rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">总收益率</div>
              <div className="font-bold" style={{ color }}>{(product.days * product.dailyRate).toFixed(2)}%</div>
            </div>
            <div className="stat-card rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">最低投入</div>
              <div className="font-bold" style={{ color }}>{product.minAmount} U</div>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">投资金额 (USDT)</label>
            <div className="relative">
              <Input
                data-testid="input-invest-amount"
                type="number"
                placeholder={`最低 ${product.minAmount} USDT`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-16"
                style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.25)", color: "#f5e6b8" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#C9A227" }}>USDT</span>
            </div>
          </div>

          {parseFloat(amount) > 0 && (
            <div className="rounded-lg p-3 space-y-1.5" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">预计每日收益</span>
                <span style={{ color }}>+{(parseFloat(amount) * product.dailyRate / 100).toFixed(4)} USDT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">到期总收益</span>
                <span style={{ color }}>+{estimatedProfit.toFixed(4)} USDT</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-1 border-t" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
                <span className="text-muted-foreground">到期返还</span>
                <span style={{ color }}>{(parseFloat(amount) + estimatedProfit).toFixed(4)} USDT</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield size={12} style={{ color: "#C9A227" }} />
              <span>不可提前赎回 · 到期自动返还本金</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield size={12} style={{ color: "#C9A227" }} />
              <span>日利润可提现 · 每笔最低50U · 手续费1U</span>
            </div>
          </div>

          <Button
            data-testid="button-confirm-invest"
            className="w-full font-bold text-sm"
            disabled={loading}
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
            onClick={handleInvest}
          >
            {loading ? "处理中..." : "确认投资"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HomePage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const account = useActiveAccount();

  useEffect(() => {
    if (account?.address) {
      const ref = new URLSearchParams(window.location.search).get("ref");
      apiRequest("POST", "/api/members/register", {
        walletAddress: account.address,
        referrerAddress: ref || null,
      }).catch(() => {});
    }
  }, [account?.address]);

  const handleInvest = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-base text-foreground">正式产品</h2>
      </div>

      {PRODUCTS.map((product, index) => {
        const color = COLORS[index % COLORS.length];
        return (
          <div
            key={product.id}
            data-testid={`card-product-${product.id}`}
            className="product-card rounded-xl p-4 transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-black text-base" style={{ color }}>{product.nameEn}</h3>
                <div className="text-xs text-muted-foreground mt-0.5">{product.name} · {product.description}</div>
              </div>
              <Button
                data-testid={`button-invest-${product.id}`}
                size="sm"
                className="font-bold text-xs shrink-0"
                style={{ background: `linear-gradient(135deg, ${color}, #9A7A1A)`, color: "#0c0a08", padding: "6px 14px" }}
                onClick={() => handleInvest(product)}
              >
                投资
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Clock size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">投资周期</span>
                </div>
                <div className="font-bold text-sm text-foreground">{product.days} 天</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <DollarSign size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">投资金额</span>
                </div>
                <div className="font-bold text-sm text-foreground">{product.minAmount} USDT</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <TrendingUp size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">总利润</span>
                </div>
                <div className="font-bold text-sm" style={{ color }}>{product.dailyRate}%/天</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(201,162,39,0.12)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">赎回时间</span>
                    <span className="text-xs font-semibold text-foreground">{product.days}天</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">投资次数</span>
                    <span className="text-xs font-semibold text-foreground">到期复购</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">总收益率</div>
                  <div className="text-sm font-black" style={{ color }}>
                    {(product.days * product.dailyRate).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="h-4" />

      <InvestDialog
        product={selectedProduct}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        color={selectedProduct ? COLORS[PRODUCTS.indexOf(selectedProduct) % COLORS.length] : "#C9A227"}
      />
    </div>
  );
}
