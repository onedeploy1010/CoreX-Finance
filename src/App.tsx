import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThirdwebProvider, useActiveAccount, useDisconnect, useActiveWallet } from "thirdweb/react";
import { Layout } from "@/components/Layout";
import LandingPage from "@/pages/Landing";
import HomePage from "@/pages/Home";
import OrdersPage from "@/pages/Orders";
import InvitePage from "@/pages/Invite";
import ProfilePage from "@/pages/Profile";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Members from "@/pages/admin/Members";
import AdminOrders from "@/pages/admin/Orders";
import AdminWithdrawals from "@/pages/admin/Withdrawals";
import AdminMessages from "@/pages/admin/Messages";
import AdminFinance from "@/pages/admin/Finance";
import AdminReferrals from "@/pages/admin/Referrals";
import AdminSettings from "@/pages/admin/Settings";
import AdminManagement from "@/pages/admin/Admins";
import AdminLogs from "@/pages/admin/Logs";
import ContractSetup from "@/pages/admin/ContractSetup";
import AdminMedia from "@/pages/admin/Media";
import AdminProducts from "@/pages/admin/Products";
import AdminRewards from "@/pages/admin/Rewards";
import SystemHealth from "@/pages/admin/SystemHealth";
import { getMember } from "@/lib/api";
import { t } from "@/lib/i18n";
import { Loader2, UserX, Link2 } from "lucide-react";

function FrontendRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/invite" component={InvitePage} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AdminRoutes() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin/dashboard" component={Dashboard} />
        <Route path="/admin/members" component={Members} />
        <Route path="/admin/referrals" component={AdminReferrals} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/withdrawals" component={AdminWithdrawals} />
        <Route path="/admin/messages" component={AdminMessages} />
        <Route path="/admin/finance" component={AdminFinance} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/admins" component={AdminManagement} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/contract" component={ContractSetup} />
        <Route path="/admin/media" component={AdminMedia} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/rewards" component={AdminRewards} />
        <Route path="/admin/system" component={SystemHealth} />
        <Route>{() => { window.location.href = "/admin/dashboard"; return null; }}</Route>
      </Switch>
    </AdminLayout>
  );
}

/** Gate page shown when user connects wallet but is not registered and has no referral link */
function NeedReferralPage() {
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0c0a08" }}>
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <UserX size={28} style={{ color: "#ef4444" }} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t("register.need_referral")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("register.need_referral_desc")}</p>
        </div>

        <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.12)" }}>
          <div className="flex items-center gap-2 justify-center">
            <Link2 size={14} style={{ color: "#C9A227" }} />
            <span className="text-xs font-medium" style={{ color: "#C9A227" }}>{t("register.referral_link_format")}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {window.location.origin}/?ref=0x...
          </p>
        </div>

        <button
          className="w-full py-3 rounded-xl font-bold text-sm transition-all"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
          onClick={() => { if (wallet) disconnect(wallet); }}
        >
          {t("register.disconnect_and_retry")}
        </button>
      </div>
    </div>
  );
}

function AppRouter() {
  const [location] = useLocation();
  const account = useActiveAccount();
  const ref = new URLSearchParams(window.location.search).get("ref");

  // Check if connected user is a registered member
  const { data: memberCheck, isLoading: memberLoading } = useQuery({
    queryKey: ["/api/member-check", account?.address],
    queryFn: () => getMember(account!.address.toLowerCase()),
    enabled: !!account?.address && !location.startsWith("/admin"),
  });

  if (location === "/admin") {
    return <AdminLogin />;
  }
  if (location.startsWith("/admin/")) {
    return <AdminRoutes />;
  }

  // Not connected → Landing page
  if (!account?.address) {
    return <LandingPage />;
  }

  // Loading member status
  if (memberLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0c0a08" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
      </div>
    );
  }

  // Connected but not registered and no referral link → block
  if (!memberCheck && !ref) {
    return <NeedReferralPage />;
  }

  // Connected (registered or has ref param for registration) → enter platform
  return <FrontendRoutes />;
}

function App() {
  return (
    <ThirdwebProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </QueryClientProvider>
    </ThirdwebProvider>
  );
}

export default App;
