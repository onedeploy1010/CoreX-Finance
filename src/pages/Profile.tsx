import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useActiveAccount, useDisconnect, useActiveWallet } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { client, bscChain, wallets } from "@/lib/thirdweb";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getMember, getEarnings, getRewardsByWallet, getWithdrawalsByWallet, getOrdersByWallet, createWithdrawal } from "@/lib/api";
import { WITHDRAW_MIN, WITHDRAW_FEE, WITHDRAW_MULTIPLE } from "@shared/schema";
import { t, getLang, shortAddr } from "@/lib/i18n";
import {
  User, Bell, Globe, ChevronRight, Check, Clock,
  LogOut, Copy, Wallet, Crown, Award, BellRing, BellOff,
  ArrowDownToLine, AlertCircle, Shield, Gift, Loader2, FileText, ExternalLink
} from "lucide-react";

function getLevelName(level: number) {
  if (level === 0) return "普通";
  return `V${level}`;
}

const LANGUAGES = [
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

function getStoredLang(): string {
  try {
    return localStorage.getItem("corex_lang") || "zh";
  } catch {
    return "zh";
  }
}

function getStoredNotifications(): { orderExpiry: boolean; dailyEarnings: boolean; referralReward: boolean; systemNotice: boolean } {
  try {
    const stored = localStorage.getItem("corex_notifications");
    if (stored) return JSON.parse(stored);
  } catch {}
  return { orderExpiry: true, dailyEarnings: true, referralReward: true, systemNotice: true };
}

export default function ProfilePage() {
  const account = useActiveAccount();
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();
  const { toast } = useToast();
  const address = account?.address?.toLowerCase();
  const lang = getLang();

  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawListOpen, setWithdrawListOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState(getStoredLang);
  const [notifications, setNotifications] = useState(getStoredNotifications);

  // Registration is handled via Home.tsx confirmation dialog

  const { data: memberData } = useQuery({
    queryKey: ["/api/members", address],
    queryFn: () => getMember(address!),
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

  const { data: withdrawalList = [], isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["/api/withdrawals", address],
    queryFn: () => getWithdrawalsByWallet(address!),
    enabled: !!address,
  });

  const { data: orderList = [] } = useQuery({
    queryKey: ["/api/orders", address],
    queryFn: () => getOrdersByWallet(address!),
    enabled: !!address,
  });

  const shortAddress = account?.address
    ? `${account.address.slice(0, 6)}****${account.address.slice(-4)}`
    : null;

  const availableBalance = parseFloat((earningsData as any)?.availableBalance || "0");
  const totalWithdrawn = parseFloat((earningsData as any)?.totalWithdrawn || "0");
  const totalDailyEarnings = parseFloat((earningsData as any)?.dailyRewards || "0");
  const directRewards = parseFloat((earningsData as any)?.directRewards || "0");
  const indirectRewards = parseFloat((earningsData as any)?.indirectRewards || "0");
  const teamRewards = parseFloat((earningsData as any)?.teamRewards || "0");
  const totalReferralRewards = directRewards + indirectRewards + teamRewards;
  const totalIncome = totalDailyEarnings + totalReferralRewards;

  const level = (memberData as any)?.level ?? 0;
  const currentLangObj = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];
  const enabledNotifCount = Object.values(notifications).filter(Boolean).length;

  // History: combine orders, all rewards, and withdrawals into one timeline
  const historyItems: any[] = [
    ...(orderList as any[]).map((o: any) => ({
      id: `order-${o.id}`,
      type: "order" as const,
      label: "投资",
      amount: `−${parseFloat(o.amount).toFixed(2)}`,
      amountColor: "#ef4444",
      detail: o.productName || o.product_name,
      date: o.startDate || o.start_date,
    })),
    ...(rewardList as any[]).map((r: any) => ({
      id: `reward-${r.id}`,
      type: "reward" as const,
      label: r.type === "daily" ? "日收益" : r.type === "direct_referral" ? "直推奖励" : r.type === "indirect_referral" ? "间推奖励" : r.type === "team_bonus" ? "团队奖励" : "奖励",
      amount: `+${parseFloat(r.amount).toFixed(2)}`,
      amountColor: "#C9A227",
      detail: r.productName || r.description || "",
      date: r.createdAt,
    })),
    ...(withdrawalList as any[]).map((w: any) => ({
      id: `withdraw-${w.id}`,
      type: "withdrawal" as const,
      label: w.status === "completed" ? "提现成功" : w.status === "rejected" ? "提现拒绝" : "提现申请",
      amount: `−${parseFloat(w.amount).toFixed(2)}`,
      amountColor: w.status === "rejected" ? "rgba(255,255,255,0.4)" : "#6bc46b",
      detail: w.status === "completed" ? `实到 ${parseFloat(w.actualAmount).toFixed(2)} U` : w.status === "rejected" ? "已退回" : "处理中",
      date: w.createdAt,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCopyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      toast({ title: "地址已复制" });
    }
  };

  const handleDisconnect = () => {
    if (wallet) {
      disconnect(wallet);
      toast({ title: "已断开连接" });
    }
  };

  const handleLangChange = (code: string) => {
    setCurrentLang(code);
    try { localStorage.setItem("corex_lang", code); } catch {}
    const lang = LANGUAGES.find(l => l.code === code);
    toast({ title: `语言已切换为 ${lang?.label || code}` });
    setLangOpen(false);
  };

  const handleNotifToggle = (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try { localStorage.setItem("corex_notifications", JSON.stringify(updated)); } catch {}
  };

  const handleWithdraw = async () => {
    if (!account) return;
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < WITHDRAW_MIN) {
      toast({ title: `${t("withdraw.min")} ${WITHDRAW_MIN} USDT`, variant: "destructive" });
      return;
    }
    if (amt % WITHDRAW_MULTIPLE !== 0) {
      toast({ title: `Amount must be a multiple of ${WITHDRAW_MULTIPLE} USDT`, variant: "destructive" });
      return;
    }
    if (amt > availableBalance) {
      toast({ title: t("orders.available") + " insufficient", variant: "destructive" });
      return;
    }
    setWithdrawLoading(true);
    try {
      await createWithdrawal(account.address, amt, WITHDRAW_FEE);
      queryClient.invalidateQueries({ queryKey: ["/api/earnings", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals", address] });
      toast({ title: "OK", description: `${amt} USDT - ${WITHDRAW_FEE} = ${(amt - WITHDRAW_FEE).toFixed(2)} USDT` });
      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const getWithdrawStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }}>{t("withdraw.pending")}</Badge>;
      case "approved":
        return <Badge style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>Processing</Badge>;
      case "completed":
        return <Badge style={{ background: "rgba(100,200,100,0.1)", color: "#6bc46b", border: "1px solid rgba(100,200,100,0.2)" }}>{t("withdraw.completed")}</Badge>;
      case "rejected":
        return <Badge style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>{t("withdraw.rejected")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const MENU_ITEMS = [
    {
      icon: ArrowDownToLine,
      label: "提现明细",
      desc: "查看提现记录",
      onClick: () => setWithdrawListOpen(true),
    },
    {
      icon: Clock,
      label: "历史明细",
      desc: "收益记录详情",
      onClick: () => setHistoryOpen(true),
    },
    {
      icon: Globe,
      label: "语言切换",
      desc: `${currentLangObj.flag} ${currentLangObj.label}`,
      onClick: () => setLangOpen(true),
    },
    {
      icon: Bell,
      label: "消息通知",
      desc: enabledNotifCount === 4 ? "全部开启" : `${enabledNotifCount}/4 项已开启`,
      onClick: () => setNotifOpen(true),
    },
    {
      icon: Award,
      label: "帮助中心",
      desc: "使用教程和常见问题",
      onClick: () => toast({ title: "帮助中心", description: "功能开发中，敬请期待" }),
    },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-base">我的</h2>
      </div>

      {/* Wallet Card */}
      <div
        className="rounded-xl p-5"
        style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.25)" }}
      >
        {account ? (
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", boxShadow: "0 0 16px rgba(201,162,39,0.3)" }}
            >
              <User size={24} className="text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-base font-mono text-foreground">{shortAddress}</span>
                <button
                  data-testid="button-copy-address"
                  onClick={handleCopyAddress}
                  className="p-1 rounded"
                  style={{ background: "rgba(201,162,39,0.1)" }}
                >
                  <Copy size={12} style={{ color: "#C9A227" }} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.3)" }}>
                  <Crown size={10} style={{ color: "#C9A227" }} />
                  <span className="text-xs font-semibold" style={{ color: "#C9A227" }}>{getLevelName(level)}</span>
                </div>
                <span className="text-xs text-muted-foreground">BSC 网络</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.3)" }}
            >
              <Wallet size={28} style={{ color: "#C9A227" }} />
            </div>
            <div className="text-center">
              <div className="font-semibold text-foreground mb-1">尚未连接钱包</div>
              <div className="text-xs text-muted-foreground">连接钱包以使用全部功能</div>
            </div>
            <ConnectButton
              client={client}
              chain={bscChain}
              wallets={wallets}
              connectButton={{
                label: "连接钱包",
                style: {
                  background: "linear-gradient(135deg, #C9A227, #9A7A1A)",
                  color: "#0c0a08",
                  fontWeight: "700",
                  fontSize: "14px",
                  padding: "10px 28px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                }
              }}
              theme="dark"
            />
          </div>
        )}
      </div>

      {/* Financial Stats */}
      {account && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.25)" }}
        >
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">{t("withdraw.balance")}</div>
            <div className="font-black text-3xl" style={{ color: "#C9A227" }}>{availableBalance.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">USDT</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="stat-card rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground">收益总金额</div>
              <div className="font-bold text-sm" style={{ color: "#E8C547" }}>{totalDailyEarnings.toFixed(2)} U</div>
            </div>
            <div className="stat-card rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground">推荐总金额</div>
              <div className="font-bold text-sm" style={{ color: "#3b82f6" }}>{totalReferralRewards.toFixed(2)} U</div>
            </div>
            <div className="stat-card rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground">总收益金额</div>
              <div className="font-bold text-sm" style={{ color: "#C9A227" }}>{totalIncome.toFixed(2)} U</div>
            </div>
            <div className="stat-card rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground">总提现金额</div>
              <div className="font-bold text-sm" style={{ color: "#6bc46b" }}>{totalWithdrawn.toFixed(2)} U</div>
            </div>
          </div>

          <Button
            data-testid="button-withdraw-now"
            className="w-full font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
            onClick={() => { setWithdrawAmount(WITHDRAW_MIN.toString()); setWithdrawDialogOpen(true); }}
          >
            <ArrowDownToLine size={14} className="mr-1.5" />
            {t("orders.withdraw_now")}
          </Button>
        </div>
      )}

      {/* Menu */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}
      >
        {MENU_ITEMS.map((item, index) => (
          <div
            key={item.label}
            data-testid={`menu-${item.label}`}
            className="flex items-center justify-between px-4 py-3.5 cursor-pointer transition-all duration-200 active:opacity-70"
            style={{
              borderBottom: index < MENU_ITEMS.length - 1 ? "1px solid rgba(201,162,39,0.08)" : "none",
            }}
            onClick={item.onClick}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(201,162,39,0.1)" }}>
                <item.icon size={15} style={{ color: "#C9A227" }} />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        ))}
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: "rgba(201,162,39,0.05)", border: "1px solid rgba(201,162,39,0.15)" }}
      >
        <div className="text-xs text-center text-muted-foreground mb-1">CoreX Finance</div>
        <div className="text-xs text-center text-muted-foreground">BSC链 · USDT理财质押平台</div>
        <div className="text-xs text-center mt-1" style={{ color: "rgba(201,162,39,0.5)" }}>v1.0.0</div>
      </div>

      {account && (
        <Button
          data-testid="button-disconnect"
          variant="outline"
          className="w-full font-semibold text-sm"
          style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", background: "rgba(239,68,68,0.06)" }}
          onClick={handleDisconnect}
        >
          <LogOut size={14} className="mr-2" />
          断开连接
        </Button>
      )}

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent
          className="max-w-sm mx-auto"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>
              {t("withdraw.title")}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              {t("withdraw.desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg p-3 text-center" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
              <div className="text-xs text-muted-foreground mb-1">{t("withdraw.balance")}</div>
              <div className="font-black text-2xl" style={{ color: "#C9A227" }}>{availableBalance.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">USDT</div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("withdraw.amount")}</label>
              <div className="flex items-center gap-3">
                <button
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 transition-all active:scale-95"
                  style={{
                    background: "rgba(201,162,39,0.1)",
                    border: "1px solid rgba(201,162,39,0.3)",
                    color: "#C9A227",
                  }}
                  onClick={() => {
                    const cur = parseFloat(withdrawAmount || "0");
                    const next = Math.max(cur - WITHDRAW_MULTIPLE, WITHDRAW_MIN);
                    setWithdrawAmount(next.toString());
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
                    {(parseFloat(withdrawAmount || "0") || WITHDRAW_MIN).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">USDT</div>
                </div>
                <button
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #C9A227, #9A7A1A)",
                    border: "1px solid #C9A227",
                    color: "#0c0a08",
                  }}
                  onClick={() => {
                    const cur = parseFloat(withdrawAmount || "0");
                    const next = cur < WITHDRAW_MIN ? WITHDRAW_MIN : Math.min(cur + WITHDRAW_MULTIPLE, Math.floor(availableBalance / WITHDRAW_MULTIPLE) * WITHDRAW_MULTIPLE);
                    setWithdrawAmount(next.toString());
                  }}
                >
                  +
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {[10, 100, 1000].map(inc => (
                  <button
                    key={inc}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                    style={{
                      background: "rgba(201,162,39,0.1)",
                      border: "1px solid rgba(201,162,39,0.25)",
                      color: "#C9A227",
                    }}
                    onClick={() => {
                      const cur = parseFloat(withdrawAmount || "0");
                      const base = cur < WITHDRAW_MIN ? WITHDRAW_MIN : cur;
                      const next = Math.min(base + inc, Math.floor(availableBalance / WITHDRAW_MULTIPLE) * WITHDRAW_MULTIPLE);
                      setWithdrawAmount(Math.max(next, WITHDRAW_MIN).toString());
                    }}
                  >
                    +{inc}
                  </button>
                ))}
                <button
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: "rgba(201,162,39,0.15)",
                    border: "1px solid rgba(201,162,39,0.3)",
                    color: "#C9A227",
                  }}
                  onClick={() => {
                    const max = Math.floor(availableBalance / WITHDRAW_MULTIPLE) * WITHDRAW_MULTIPLE;
                    setWithdrawAmount(Math.max(max, WITHDRAW_MIN).toString());
                  }}
                >
                  {t("withdraw.all")}
                </button>
              </div>
            </div>

            {parseFloat(withdrawAmount) >= WITHDRAW_MIN && (
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("withdraw.amount_label")}</span>
                  <span className="text-foreground">{parseFloat(withdrawAmount).toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("withdraw.fee")}</span>
                  <span style={{ color: "#ef4444" }}>-{WITHDRAW_FEE} USDT</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-1 border-t" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
                  <span className="text-muted-foreground">{t("withdraw.actual")}</span>
                  <span style={{ color: "#C9A227" }}>{(parseFloat(withdrawAmount) - WITHDRAW_FEE).toFixed(2)} USDT</span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle size={11} style={{ color: "#C9A227" }} />
                <span>{t("withdraw.min")}: {WITHDRAW_MIN} USDT · {WITHDRAW_MULTIPLE}的倍数</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle size={11} style={{ color: "#C9A227" }} />
                <span>{t("withdraw.fee_per")} {WITHDRAW_FEE} USDT</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield size={11} style={{ color: "#C9A227" }} />
                <span>{t("withdraw.only_profit")}</span>
              </div>
            </div>

            <Button
              data-testid="button-confirm-withdraw"
              className="w-full font-bold text-sm"
              disabled={withdrawLoading || parseFloat(withdrawAmount || "0") < WITHDRAW_MIN}
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              onClick={handleWithdraw}
            >
              {withdrawLoading ? t("withdraw.processing") : t("withdraw.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Records Dialog */}
      <Dialog open={withdrawListOpen} onOpenChange={setWithdrawListOpen}>
        <DialogContent
          className="max-w-md mx-auto max-h-[80vh] overflow-y-auto"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>
              提现明细
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              提现记录详情
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {withdrawalsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin" style={{ color: "#C9A227" }} />
              </div>
            ) : (withdrawalList as any[]).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <ArrowDownToLine size={32} className="mx-auto mb-2 opacity-20" />
                <p>{t("orders.no_withdrawals")}</p>
              </div>
            ) : (
              (withdrawalList as any[]).map((w: any) => (
                <div
                  key={w.id}
                  className="rounded-xl p-3 space-y-2"
                  style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.1)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-foreground">{t("withdraw.title")} #{w.id}</div>
                    {getWithdrawStatusBadge(w.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground">{t("withdraw.amount_label")}</div>
                      <div className="text-xs font-bold text-foreground">{parseFloat(w.amount).toFixed(2)} U</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground">{t("withdraw.fee")}</div>
                      <div className="text-xs font-bold" style={{ color: "#ef4444" }}>-{parseFloat(w.fee).toFixed(2)} U</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground">{t("withdraw.actual")}</div>
                      <div className="text-xs font-bold" style={{ color: "#C9A227" }}>{parseFloat(w.actualAmount).toFixed(2)} U</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</div>
                    {w.txHash && (
                      <a
                        href={`https://bscscan.com/tx/${w.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "#C9A227" }}
                      >
                        <ExternalLink size={10} />
                        <span>BscScan</span>
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog - all records (orders, rewards, withdrawals) */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          className="max-w-md mx-auto max-h-[80vh] overflow-y-auto"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>
              历史明细
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              投资·收益·提现记录
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {rewardsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin" style={{ color: "#C9A227" }} />
              </div>
            ) : historyItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Gift size={32} className="mx-auto mb-2 opacity-20" />
                <p>{t("reward.no_records")}</p>
              </div>
            ) : (
              historyItems.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-xl p-3"
                  style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.1)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{
                        background: item.type === "order" ? "#3b82f6" : item.type === "withdrawal" ? "#6bc46b" : "#E8C547"
                      }} />
                      <span className="text-sm font-semibold" style={{
                        color: item.type === "order" ? "#3b82f6" : item.type === "withdrawal" ? "#6bc46b" : "#E8C547"
                      }}>
                        {item.label}
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: item.amountColor }}>
                      {item.amount} U
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <span className="text-muted-foreground">{item.detail}</span>
                    <span className="text-muted-foreground">{new Date(item.date).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent
          className="max-w-sm mx-auto"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>
              消息通知
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              管理您的通知偏好设置
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            {[
              { key: "orderExpiry" as const, icon: BellRing, label: "订单到期提醒", desc: "质押到期时通知您" },
              { key: "dailyEarnings" as const, icon: Bell, label: "每日收益通知", desc: "每日结算后推送收益" },
              { key: "referralReward" as const, icon: Bell, label: "推荐奖励通知", desc: "获得推荐奖励时通知" },
              { key: "systemNotice" as const, icon: Bell, label: "系统公告", desc: "平台重要通知和公告" },
            ].map((item) => (
              <div
                key={item.key}
                data-testid={`notif-toggle-${item.key}`}
                className="flex items-center justify-between px-3 py-3 rounded-lg transition-all"
                style={{ background: notifications[item.key] ? "rgba(201,162,39,0.06)" : "transparent" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: notifications[item.key] ? "rgba(201,162,39,0.12)" : "rgba(255,255,255,0.04)",
                      border: notifications[item.key] ? "1px solid rgba(201,162,39,0.25)" : "1px solid rgba(255,255,255,0.08)",
                    }}>
                    {notifications[item.key]
                      ? <item.icon size={14} style={{ color: "#C9A227" }} />
                      : <BellOff size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
                    }
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
                <Switch
                  checked={notifications[item.key]}
                  onCheckedChange={() => handleNotifToggle(item.key)}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Language Dialog */}
      <Dialog open={langOpen} onOpenChange={setLangOpen}>
        <DialogContent
          className="max-w-sm mx-auto"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>
              语言设置
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              选择您的界面语言
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === currentLang;
              return (
                <button
                  key={lang.code}
                  data-testid={`lang-option-${lang.code}`}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200"
                  style={{
                    background: isActive ? "rgba(201,162,39,0.12)" : "transparent",
                    border: isActive ? "1px solid rgba(201,162,39,0.3)" : "1px solid transparent",
                  }}
                  onClick={() => handleLangChange(lang.code)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-sm font-semibold" style={{ color: isActive ? "#C9A227" : "rgba(255,255,255,0.7)" }}>
                      {lang.label}
                    </span>
                  </div>
                  {isActive && <Check size={16} style={{ color: "#C9A227" }} />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
