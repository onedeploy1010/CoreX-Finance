import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { useActiveAccount } from "thirdweb/react";
import { useSendTransaction } from "thirdweb/react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { registerMember, createOrder, getMember, getProducts, DBProduct } from "@/lib/api";
import { TrendingUp, Clock, DollarSign, Shield, UserPlus, Loader2 } from "lucide-react";
import { t, getLang } from "@/lib/i18n";
import {
  prepareApproveUSDT,
  prepareInvest,
  getUSDTAllowance,
  parseUSDT,
} from "@/lib/contracts";

type Product = DBProduct;

function getProductName(product: Product): string {
  const lang = getLang();
  return (lang === "zh" || lang === "zh-TW") ? product.name : product.nameEn;
}

function getProductDesc(product: { id: number; description: string }): string {
  const lang = getLang();
  if (lang === "zh" || lang === "zh-TW") return product.description;
  return t(`product.desc_${product.id}`);
}

const COLORS = ["#C9A227", "#E8C547", "#D4A832", "#C9A227", "#E8C547"];

function InvestDialog({ product, open, onClose, color }: { product: Product | null; open: boolean; onClose: () => void; color: string }) {
  const [amount, setAmount] = useState("");
  const account = useActiveAccount();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "approving" | "investing" | "confirming">("idle");
  const { mutateAsync: sendTransaction } = useSendTransaction();

  useEffect(() => {
    if (open && product) {
      setAmount(product.minAmount.toString());
    }
  }, [open, product]);

  if (!product) return null;

  const totalReturn = product.days * product.dailyRate / 100;
  const estimatedProfit = parseFloat(amount || "0") * totalReturn;

  const handleInvest = async () => {
    if (!account) {
      toast({ title: t("invest.connect_wallet"), variant: "destructive" });
      return;
    }
    const amt = parseFloat(amount);
    if (!amount || amt < product.minAmount) {
      toast({ title: t("invest.min_amount", undefined, { amount: product.minAmount }), variant: "destructive" });
      return;
    }
    if (amt % product.minAmount !== 0) {
      toast({ title: t("invest.multiple_amount", undefined, { amount: product.minAmount }), variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const amountWei = parseUSDT(amount);

      // Step 1: Approve USDT
      setStep("approving");
      const allowance = await getUSDTAllowance(account.address);
      if (allowance < amountWei) {
        const approveTx = prepareApproveUSDT(amountWei);
        await sendTransaction(approveTx);
      }

      // Step 2: Call invest on smart contract
      setStep("investing");
      const investTx = prepareInvest(product.id, amountWei);
      const result = await sendTransaction(investTx);
      const txHash = result.transactionHash;

      if (!txHash) {
        toast({ title: t("invest.tx_failed"), variant: "destructive" });
        return;
      }

      // Step 3: Create order in database via callback
      setStep("confirming");

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + product.days);

      await createOrder({
        walletAddress: account.address,
        productId: product.id,
        amount: amount,
        txHash: txHash,
        productName: product.nameEn,
        dailyRate: product.dailyRate.toString(),
        days: product.days,
        endDate: endDate,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/orders", account.address.toLowerCase()] });
      queryClient.invalidateQueries({ queryKey: ["/api/earnings", account.address.toLowerCase()] });
      queryClient.invalidateQueries({ queryKey: ["/api/members", account.address.toLowerCase()] });
      queryClient.invalidateQueries({ queryKey: ["/api/members", account.address.toLowerCase(), "team-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

      toast({
        title: t("invest.success"),
        description: t("invest.success_desc", undefined, { amount, product: getProductName(product) }),
      });
      onClose();
      setAmount("");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        toast({ title: t("invest.cancelled"), variant: "destructive" });
      } else {
        toast({ title: t("invest.failed"), description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
      setStep("idle");
    }
  };

  const getButtonText = () => {
    switch (step) {
      case "approving": return t("invest.approving");
      case "investing": return t("invest.confirming_tx");
      case "confirming": return t("invest.creating_order");
      default: return loading ? t("invest.processing") : t("invest.confirm");
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
            {getProductName(product)}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            {`${getProductDesc(product)} · ${product.days}${t("home.day_cycle")} · ${t("home.daily_rate")}${product.dailyRate}%`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{t("home.cycle")}</div>
              <div className="font-bold" style={{ color }}>{product.days} {t("common.days")}</div>
            </div>
            <div className="stat-card rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{t("home.daily_rate")}</div>
              <div className="font-bold" style={{ color }}>{product.dailyRate}%</div>
            </div>
            <div className="stat-card rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{t("home.total_return")}</div>
              <div className="font-bold" style={{ color }}>{(product.days * product.dailyRate).toFixed(2)}%</div>
            </div>
            <div className="stat-card rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{t("home.min_invest")}</div>
              <div className="font-bold" style={{ color }}>{product.minAmount} U</div>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">{t("home.invest_amount_usdt")}</label>
            <div className="flex items-center gap-3">
              <button
                data-testid="button-amount-minus"
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 transition-all active:scale-95"
                style={{
                  background: "rgba(201,162,39,0.1)",
                  border: "1px solid rgba(201,162,39,0.3)",
                  color: "#C9A227",
                }}
                onClick={() => {
                  const cur = parseFloat(amount || "0");
                  const next = Math.max(cur - product.minAmount, product.minAmount);
                  setAmount(next.toString());
                }}
              >
                −
              </button>
              <div
                className="flex-1 rounded-xl py-3 text-center"
                style={{
                  background: "rgba(201,162,39,0.08)",
                  border: "1px solid rgba(201,162,39,0.3)",
                }}
              >
                <div className="font-black text-2xl" style={{ color: "#f5e6b8" }}>
                  {(parseFloat(amount || "0") || product.minAmount).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">USDT</div>
              </div>
              <button
                data-testid="button-amount-plus"
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #C9A227, #9A7A1A)",
                  border: "1px solid #C9A227",
                  color: "#0c0a08",
                }}
                onClick={() => {
                  const cur = parseFloat(amount || "0");
                  const next = cur < product.minAmount ? product.minAmount : cur + product.minAmount;
                  setAmount(next.toString());
                }}
              >
                +
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {`${t("home.each_step")} ±${product.minAmount} USDT`}
              </span>
              <span className="text-xs" style={{ color: "rgba(201,162,39,0.6)" }}>
                {Math.max(1, Math.round(parseFloat(amount || "0") / product.minAmount))}x {t("home.times")}
              </span>
            </div>
          </div>

          {parseFloat(amount) > 0 && (
            <div className="rounded-lg p-3 space-y-1.5" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("home.est_daily")}</span>
                <span style={{ color }}>+{(parseFloat(amount) * product.dailyRate / 100).toFixed(6)} USDT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("home.est_total_profit")}</span>
                <span style={{ color }}>+{estimatedProfit.toFixed(6)} USDT</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-1 border-t" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
                <span className="text-muted-foreground">{t("home.total_return_amount")}</span>
                <span style={{ color }}>{(parseFloat(amount) + estimatedProfit).toFixed(6)} USDT</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield size={12} style={{ color: "#C9A227" }} />
              <span>{t("home.no_early_redeem")}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield size={12} style={{ color: "#C9A227" }} />
              <span>{t("home.daily_withdraw_note")}</span>
            </div>
          </div>

          <Button
            data-testid="button-confirm-invest"
            className="w-full font-bold text-sm"
            disabled={loading}
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
            onClick={handleInvest}
          >
            {getButtonText()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatShares(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + "万";
  return n.toLocaleString();
}

export default function HomePage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<{ address: string; level: number } | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const account = useActiveAccount();
  const { toast } = useToast();

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: getProducts,
  });

  useEffect(() => {
    if (!account?.address) return;
    const addr = account.address.toLowerCase();

    (async () => {
      // Already registered?
      const existing = await getMember(addr);
      if (existing) return;

      // Need ref param
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (!ref) {
        toast({ title: t("register.need_referral"), description: t("register.need_referral_desc"), variant: "destructive" });
        return;
      }

      // Check referrer exists and has invested
      const refAddr = ref.toLowerCase();
      if (refAddr === addr) return;
      const referrer = await getMember(refAddr);
      if (!referrer) {
        toast({ title: t("register.referrer_not_found"), variant: "destructive" });
        return;
      }

      // Show confirmation dialog
      setReferrerInfo({ address: ref, level: referrer.level ?? 0 });
      setRegisterDialogOpen(true);
    })().catch(() => {});
  }, [account?.address]);

  const handleConfirmRegister = async () => {
    if (!account?.address || !referrerInfo) return;
    setRegisterLoading(true);
    try {
      await registerMember(account.address, referrerInfo.address);
      toast({ title: t("register.success"), description: t("register.success_desc") });
      setRegisterDialogOpen(false);
      setReferrerInfo(null);
    } catch (err: any) {
      toast({ title: t("register.failed"), description: err?.message || "", variant: "destructive" });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleInvest = async (product: Product) => {
    if (account?.address) {
      const member = await getMember(account.address.toLowerCase());
      if (!member) {
        toast({ title: t("invest.need_referral"), description: t("invest.need_referral_desc"), variant: "destructive" });
        return;
      }
    }
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-base text-foreground">{t("home.products")}</h2>
      </div>

      {products.map((product, index) => {
        const color = COLORS[index % COLORS.length];
        const sharePercent = product.totalShares > 0 ? Math.min(100, (product.usedShares / product.totalShares) * 100) : 0;
        return (
          <div
            key={product.id}
            data-testid={`card-product-${product.id}`}
            className="product-card rounded-xl p-4 transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-black text-base" style={{ color }}>{getProductName(product)}</h3>
                <div className="text-xs text-muted-foreground mt-0.5">{getProductDesc(product)}</div>
              </div>
              <Button
                data-testid={`button-invest-${product.id}`}
                size="sm"
                className="font-bold text-xs shrink-0"
                style={{ background: `linear-gradient(135deg, ${color}, #9A7A1A)`, color: "#0c0a08", padding: "6px 14px" }}
                onClick={() => handleInvest(product)}
              >
                {t("home.invest")}
              </Button>
            </div>

            {/* 投资份数 */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{t("home.shares") || "投资份数"}</span>
                <span className="text-[10px] font-semibold" style={{ color }}>{formatShares(product.usedShares)}/{formatShares(product.totalShares)}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(201,162,39,0.1)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${sharePercent}%`, background: `linear-gradient(90deg, ${color}, #9A7A1A)` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Clock size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t("home.cycle")}</span>
                </div>
                <div className="font-bold text-sm text-foreground">{product.days} {t("common.days")}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <DollarSign size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t("home.amount")}</span>
                </div>
                <div className="font-bold text-sm text-foreground">{product.minAmount} USDT</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <TrendingUp size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t("home.total_profit")}</span>
                </div>
                <div className="font-bold text-sm" style={{ color }}>{product.dailyRate}%/天</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(201,162,39,0.12)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{t("home.redeem_time")}</span>
                    <span className="text-xs font-semibold text-foreground">{product.days}{t("common.days")}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{t("home.invest_times")}</span>
                    <span className="text-xs font-semibold text-foreground">{t("home.repurchase")}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{t("home.total_return")}</div>
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
        color={selectedProduct ? COLORS[products.indexOf(selectedProduct) % COLORS.length] : "#C9A227"}
      />

      {/* Registration Confirmation Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={(open) => { if (!registerLoading) setRegisterDialogOpen(open); }}>
        <DialogContent
          className="max-w-sm mx-auto"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>
              {t("register.confirm_title")}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              {t("register.confirm_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", boxShadow: "0 0 20px rgba(201,162,39,0.3)" }}
              >
                <UserPlus size={28} className="text-black" />
              </div>
            </div>

            {referrerInfo && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
                <div className="text-xs text-muted-foreground text-center mb-2">{t("register.your_referrer")}</div>
                <div className="text-center">
                  <div className="font-mono font-bold text-sm" style={{ color: "#f5e6b8" }}>
                    {referrerInfo.address.slice(0, 6)}****{referrerInfo.address.slice(-4)}
                  </div>
                  <div className="mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: referrerInfo.level > 0 ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.06)",
                      color: referrerInfo.level > 0 ? "#C9A227" : "rgba(255,255,255,0.5)",
                      border: referrerInfo.level > 0 ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.1)",
                    }}>
                      {referrerInfo.level > 0 ? `V${referrerInfo.level}` : t("home.normal")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield size={12} style={{ color: "#C9A227" }} />
                <span>{t("register.bind_note")}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield size={12} style={{ color: "#C9A227" }} />
                <span>{t("register.invest_note")}</span>
              </div>
            </div>

            <div
              className="rounded-lg p-2.5 text-[11px] leading-relaxed"
              style={{ background: "rgba(232,197,71,0.08)", border: "1px solid rgba(232,197,71,0.25)", color: "#E8C547" }}
            >
              {t("register.inactive_after_register")}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-sm"
                style={{ border: "1px solid rgba(201,162,39,0.25)", color: "rgba(255,255,255,0.6)" }}
                onClick={() => setRegisterDialogOpen(false)}
                disabled={registerLoading}
              >
                {t("register.cancel")}
              </Button>
              <Button
                className="flex-1 font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
                onClick={handleConfirmRegister}
                disabled={registerLoading}
              >
                {registerLoading ? <><Loader2 size={14} className="mr-1 animate-spin" />{t("register.registering")}</> : t("register.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
