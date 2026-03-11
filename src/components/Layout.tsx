import { useLocation, Link } from "wouter";
import { Home, ClipboardList, Users, User } from "lucide-react";
import { ConnectButton } from "thirdweb/react";
import { client, bscChain, wallets } from "@/lib/thirdweb";

const NAV_ITEMS = [
  { path: "/", label: "首页", icon: Home },
  { path: "/orders", label: "订单", icon: ClipboardList },
  { path: "/invite", label: "邀请", icon: Users },
  { path: "/profile", label: "我的", icon: User },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
      style={{ background: "linear-gradient(180deg, #0d0b07 0%, rgba(13,11,7,0.95) 100%)", borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", boxShadow: "0 0 12px rgba(201,162,39,0.4)" }}>
          <span className="text-black font-black text-sm">C</span>
        </div>
        <span className="font-bold text-lg tracking-wide gold-text">CoreX</span>
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
            fontSize: "13px",
            padding: "6px 14px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }
        }}
        detailsButton={{
          style: {
            background: "rgba(201,162,39,0.12)",
            border: "1px solid rgba(201,162,39,0.35)",
            color: "#C9A227",
            fontWeight: "600",
            fontSize: "12px",
            padding: "5px 12px",
            borderRadius: "8px",
          }
        }}
        theme="dark"
      />
    </header>
  );
}

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-2 pb-safe">
      {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
        const isActive = location === path;
        return (
          <Link key={path} href={path}>
            <div
              data-testid={`nav-${label}`}
              className="flex flex-col items-center gap-1 px-4 py-1 cursor-pointer transition-all duration-200"
            >
              <Icon
                size={20}
                className="transition-all duration-200"
                style={{ color: isActive ? "#C9A227" : "rgba(255,255,255,0.4)" }}
              />
              <span
                className="text-xs font-medium transition-all duration-200"
                style={{ color: isActive ? "#C9A227" : "rgba(255,255,255,0.4)" }}
              >
                {label}
              </span>
              {isActive && (
                <div
                  className="absolute bottom-0 w-8 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, transparent, #C9A227, transparent)" }}
                />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0c0a08" }}>
      <AppHeader />
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
