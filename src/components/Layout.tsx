import { useLocation, Link } from "wouter";
import { Home, ClipboardList, Users, User } from "lucide-react";
import { ConnectButton } from "thirdweb/react";
import { client, bscChain, wallets } from "@/lib/thirdweb";
import { LangSwitch } from "@/components/LangSwitch";

const NAV_ITEMS = [
  { path: "/", label: "首页", icon: Home },
  { path: "/orders", label: "订单", icon: ClipboardList },
  { path: "/invite", label: "邀请", icon: Users },
  { path: "/profile", label: "我的", icon: User },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5"
      style={{ background: "linear-gradient(180deg, #0d0b07 0%, rgba(13,11,7,0.95) 100%)", borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
        try { sessionStorage.removeItem("corex_entered"); } catch {}
        window.location.href = "/";
      }}>
        <img src="/corex.png" alt="CoreX" className="w-8 h-8" />
        <span className="font-bold text-lg tracking-wide gold-text">CoreX</span>
      </div>
      <div className="flex items-center gap-2">
        <LangSwitch />
        <ConnectButton
          client={client}
          chain={bscChain}
          wallets={wallets}
          connectModal={{
            size: "compact",
            showThirdwebBranding: false,
          }}
          connectButton={{
            label: "连接钱包",
            style: {
              background: "linear-gradient(135deg, #C9A227, #9A7A1A)",
              color: "#0c0a08",
              fontWeight: "700",
              fontSize: "14px",
              padding: "8px 18px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              minHeight: "40px",
            }
          }}
          detailsButton={{
            style: {
              background: "rgba(201,162,39,0.12)",
              border: "1px solid rgba(201,162,39,0.35)",
              color: "#C9A227",
              fontWeight: "600",
              fontSize: "13px",
              padding: "6px 14px",
              borderRadius: "10px",
              minHeight: "40px",
            }
          }}
          theme="dark"
        />
      </div>
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
              className="flex flex-col items-center gap-0.5 px-5 py-1.5 cursor-pointer transition-all duration-200"
              style={{ minWidth: "56px", minHeight: "44px" }}
            >
              <Icon
                size={22}
                className="transition-all duration-200"
                style={{ color: isActive ? "#C9A227" : "rgba(255,255,255,0.4)" }}
              />
              <span
                className="text-[11px] font-medium transition-all duration-200"
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
