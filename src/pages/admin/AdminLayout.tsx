import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { getAdminSession, adminLogout } from "@/lib/api";
import {
  LayoutDashboard, Users, ShoppingCart, ArrowDownToLine,
  MessageSquare, DollarSign, LogOut, Menu, X, ChevronRight, Network, Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NAV_ITEMS = [
  { path: "/admin/dashboard", label: "统计台", icon: LayoutDashboard },
  { path: "/admin/members", label: "会员管理", icon: Users },
  { path: "/admin/referrals", label: "推荐管理", icon: Network },
  { path: "/admin/orders", label: "订单管理", icon: ShoppingCart },
  { path: "/admin/withdrawals", label: "提现管理", icon: ArrowDownToLine },
  { path: "/admin/messages", label: "消息管理", icon: MessageSquare },
  { path: "/admin/finance", label: "财务管理", icon: DollarSign },
  { path: "/admin/settings", label: "系统设置", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const admin = getAdminSession();

  useEffect(() => {
    if (!admin) {
      setLocation("/admin");
    }
  }, [admin]);

  const handleLogout = () => {
    adminLogout();
    toast({ title: "已退出登录" });
    setLocation("/admin");
  };

  if (!admin) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "#0c0a08" }}>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: "linear-gradient(180deg, #1a1510, #0e0c08)", borderRight: "1px solid rgba(201,162,39,0.15)" }}
      >
        <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)" }}>
            <LayoutDashboard size={18} className="text-black" />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: "#C9A227" }}>CoreX Admin</div>
            <div className="text-xs text-muted-foreground">{admin.username}</div>
          </div>
          <button className="lg:hidden ml-auto p-1" onClick={() => setSidebarOpen(false)}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  data-testid={`nav-${item.label}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: active ? "rgba(201,162,39,0.12)" : "transparent",
                    border: active ? "1px solid rgba(201,162,39,0.2)" : "1px solid transparent",
                  }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={16} style={{ color: active ? "#C9A227" : "rgba(255,255,255,0.4)" }} />
                  <span className="text-sm font-medium" style={{ color: active ? "#C9A227" : "rgba(255,255,255,0.6)" }}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid rgba(201,162,39,0.15)" }}>
          <button
            data-testid="button-admin-logout"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all"
            style={{ color: "#ef4444" }}
            onClick={handleLogout}
          >
            <LogOut size={14} />
            退出登录
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 lg:hidden"
          style={{ background: "rgba(12,10,8,0.95)", borderBottom: "1px solid rgba(201,162,39,0.15)", backdropFilter: "blur(8px)" }}
        >
          <button data-testid="button-menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} style={{ color: "#C9A227" }} />
          </button>
          <span className="font-bold text-sm" style={{ color: "#C9A227" }}>CoreX Admin</span>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
