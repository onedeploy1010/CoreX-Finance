import { Button } from "@/components/ui/button";
import { useActiveAccount, useDisconnect, useActiveWallet } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { client, bscChain, wallets } from "@/lib/thirdweb";
import { useToast } from "@/hooks/use-toast";
import {
  User, Shield, Bell, Globe, ChevronRight,
  LogOut, Copy, Wallet, TrendingUp, Crown, Award
} from "lucide-react";

const MENU_ITEMS = [
  { icon: Wallet, label: "资产管理", desc: "查看USDT余额及交易记录" },
  { icon: Shield, label: "安全设置", desc: "账户安全保障" },
  { icon: Bell, label: "消息通知", desc: "投资到期提醒" },
  { icon: Globe, label: "语言设置", desc: "中文 / English" },
  { icon: Award, label: "帮助中心", desc: "使用教程和常见问题" },
];

export default function ProfilePage() {
  const account = useActiveAccount();
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();
  const { toast } = useToast();

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
                  <span className="text-xs font-semibold" style={{ color: "#C9A227" }}>V2</span>
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
            <div className="font-black text-lg" style={{ color: "#C9A227" }}>4</div>
            <div className="text-xs text-muted-foreground mt-0.5">直推人数</div>
          </div>
          <div className="stat-card rounded-xl p-3 text-center">
            <div className="font-black text-lg" style={{ color: "#C9A227" }}>269.6</div>
            <div className="text-xs text-muted-foreground mt-0.5">累计收益(U)</div>
          </div>
          <div className="stat-card rounded-xl p-3 text-center">
            <div className="font-black text-lg" style={{ color: "#C9A227" }}>2</div>
            <div className="text-xs text-muted-foreground mt-0.5">活跃订单</div>
          </div>
        </div>
      )}

      <div
        className="rounded-xl"
        style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}
      >
        {MENU_ITEMS.map((item, index) => (
          <div
            key={item.label}
            data-testid={`menu-${item.label}`}
            className="flex items-center justify-between px-4 py-3.5 cursor-pointer transition-all duration-200"
            style={{
              borderBottom: index < MENU_ITEMS.length - 1 ? "1px solid rgba(201,162,39,0.08)" : "none",
            }}
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
    </div>
  );
}
