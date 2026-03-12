import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useActiveAccount, useDisconnect, useActiveWallet } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { client, bscChain, wallets } from "@/lib/thirdweb";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { registerMember, getMember, getTeamStats, getEarnings, getOrdersByWallet } from "@/lib/api";
import {
  User, Bell, Globe, ChevronRight, Check,
  LogOut, Copy, Wallet, Crown, Award, BellRing, BellOff
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

  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(getStoredLang);
  const [notifications, setNotifications] = useState(getStoredNotifications);

  useEffect(() => {
    if (account?.address) {
      const ref = new URLSearchParams(window.location.search).get("ref");
      registerMember(account.address, ref || null).catch(() => {});
    }
  }, [account?.address]);

  const { data: memberData } = useQuery({
    queryKey: ["/api/members", address],
    queryFn: () => getMember(address!),
    enabled: !!address,
  });

  const { data: teamStats } = useQuery({
    queryKey: ["/api/members", address, "team-stats"],
    queryFn: () => getTeamStats(address!),
    enabled: !!address,
  });

  const { data: earningsData } = useQuery({
    queryKey: ["/api/earnings", address],
    queryFn: () => getEarnings(address!),
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

  const activeOrders = (orderList as any[]).filter((o: any) => o.status === "active").length;
  const totalEarned = parseFloat(earningsData?.totalEarnings || "0") + parseFloat(earningsData?.totalRewards || "0");
  const level = (memberData as any)?.level ?? 0;
  const currentLangObj = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];
  const enabledNotifCount = Object.values(notifications).filter(Boolean).length;

  const MENU_ITEMS = [
    {
      icon: Bell,
      label: "消息通知",
      desc: enabledNotifCount === 4 ? "全部开启" : `${enabledNotifCount}/4 项已开启`,
      onClick: () => setNotifOpen(true),
    },
    {
      icon: Globe,
      label: "语言设置",
      desc: `${currentLangObj.flag} ${currentLangObj.label}`,
      onClick: () => setLangOpen(true),
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

      {account && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card rounded-xl p-3 text-center">
            <div className="font-black text-lg" style={{ color: "#C9A227" }}>{teamStats?.directCount || 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">直推人数</div>
          </div>
          <div className="stat-card rounded-xl p-3 text-center">
            <div className="font-black text-lg" style={{ color: "#C9A227" }}>{totalEarned.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">累计收益(U)</div>
          </div>
          <div className="stat-card rounded-xl p-3 text-center">
            <div className="font-black text-lg" style={{ color: "#C9A227" }}>{activeOrders}</div>
            <div className="text-xs text-muted-foreground mt-0.5">活跃订单</div>
          </div>
        </div>
      )}

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
