import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { getAdminSession, adminLogout } from "@/lib/api";
import {
  LayoutDashboard, Users, ShoppingCart, ArrowDownToLine,
  MessageSquare, DollarSign, LogOut, Menu, X, Network, Settings,
  Shield, ScrollText, FileCode, Image, Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Each nav item requires a specific permission to be visible
const NAV_ITEMS: { path: string; label: string; icon: any; perm: string }[] = [
  { path: "/admin/dashboard", label: "统计台", icon: LayoutDashboard, perm: "dashboard.read" },
  { path: "/admin/members", label: "会员管理", icon: Users, perm: "members.read" },
  { path: "/admin/referrals", label: "推荐管理", icon: Network, perm: "referrals.read" },
  { path: "/admin/orders", label: "订单管理", icon: ShoppingCart, perm: "orders.read" },
  { path: "/admin/withdrawals", label: "提现管理", icon: ArrowDownToLine, perm: "withdrawals.read" },
  { path: "/admin/messages", label: "消息管理", icon: MessageSquare, perm: "messages.read" },
  { path: "/admin/finance", label: "财务管理", icon: DollarSign, perm: "finance.read" },
  { path: "/admin/settings", label: "系统设置", icon: Settings, perm: "settings.read" },
  { path: "/admin/admins", label: "管理员", icon: Shield, perm: "admins.read" },
  { path: "/admin/logs", label: "操作日志", icon: ScrollText, perm: "logs.read" },
  { path: "/admin/contract", label: "合约配置", icon: FileCode, perm: "settings.read" },
  { path: "/admin/media", label: "Landing Page", icon: Image, perm: "media.read" },
  { path: "/admin/products", label: "产品管理", icon: Package, perm: "settings.read" },
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: "超级管理员",
  finance: "财务",
  customer_service: "客服",
  custom: "自定义",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const admin = getAdminSession();
  const isSuperAdmin = admin?.role === "superadmin";
  const perms: string[] = admin?.permissions || [];

  useEffect(() => {
    if (!admin) {
      setLocation("/admin");
    }
  }, [admin]);

  // Redirect unauthorized routes on initial load only
  useEffect(() => {
    if (!admin) return;
    const allowed = NAV_ITEMS.filter(item => perms.includes(item.perm));
    const isAllowed = allowed.some(item => location === item.path);
    if (!isAllowed && allowed.length > 0) {
      setLocation(allowed[0].path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    adminLogout();
    toast({ title: "已退出登录" });
    setLocation("/admin");
  };

  const filteredNav = isSuperAdmin ? NAV_ITEMS : NAV_ITEMS.filter(item => perms.includes(item.perm));
  const roleLabel = ROLE_LABELS[admin?.role] || admin?.role || "";

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
          <img src="/corex.png" alt="CoreX" className="w-9 h-9 rounded-lg" />
          <div>
            <div className="font-bold text-sm" style={{ color: "#C9A227" }}>CoreX Admin</div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{admin.username}</span>
              <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.12)", color: "#C9A227" }}>{roleLabel}</span>
            </div>
          </div>
          <button className="lg:hidden ml-auto p-1" onClick={() => setSidebarOpen(false)}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {filteredNav.map(item => {
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
