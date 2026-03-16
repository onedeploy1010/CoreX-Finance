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
import { getMember, registerMember } from "@/lib/api";
import { t } from "@/lib/i18n";
import { Loader2, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

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

/** Gate page: prompt user to enter referrer address to register */
function ReferralInputPage() {
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  const refParam = new URLSearchParams(window.location.search).get("ref") || "";
  const [refInput, setRefInput] = useState(refParam);
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "invalid" | "registering" | "done">("idle");
  const [error, setError] = useState("");
  const [referrerLevel, setReferrerLevel] = useState(0);

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  const handleCheck = async () => {
    const addr = refInput.trim().toLowerCase();
    if (!isValidAddress(addr)) {
      setStatus("invalid");
      setError(t("register.invalid_address"));
      return;
    }
    if (account && addr === account.address.toLowerCase()) {
      setStatus("invalid");
      setError(t("register.cannot_refer_self"));
      return;
    }
    setStatus("checking");
    setError("");
    try {
      const member = await getMember(addr);
      if (!member) {
        setStatus("invalid");
        setError(t("register.referrer_not_found"));
        return;
      }
      setReferrerLevel(member.level ?? 0);
      setStatus("valid");
    } catch {
      setStatus("invalid");
      setError(t("register.check_failed"));
    }
  };

  const handleRegister = async () => {
    if (!account?.address) return;
    setStatus("registering");
    try {
      await registerMember(account.address, refInput.trim());
      setStatus("done");
      // Reload to enter platform
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      setStatus("invalid");
      const msg = err?.message || "";
      if (msg === "REFERRER_NOT_INVESTED") {
        setError(t("register.referrer_not_invested"));
      } else {
        setError(msg || t("register.failed"));
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0c0a08" }}>
      <div className="w-full max-w-sm space-y-5">
        {/* Icon */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.2)" }}>
            <UserPlus size={28} style={{ color: "#C9A227" }} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">{t("register.enter_referrer")}</h2>
          <p className="text-sm text-muted-foreground">{t("register.enter_referrer_desc")}</p>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <input
            type="text"
            value={refInput}
            onChange={(e) => { setRefInput(e.target.value); setStatus("idle"); setError(""); }}
            placeholder="0x..."
            className="w-full px-4 py-3 rounded-xl text-sm font-mono"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${status === "valid" ? "rgba(34,197,94,0.4)" : status === "invalid" ? "rgba(239,68,68,0.4)" : "rgba(201,162,39,0.2)"}`,
              color: "#fff",
              outline: "none",
            }}
          />

          {/* Error / Valid feedback */}
          {status === "invalid" && error && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "#ef4444" }}>
              <AlertCircle size={12} /> {error}
            </div>
          )}
          {status === "valid" && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "#22c55e" }}>
              <CheckCircle2 size={12} />
              {t("register.referrer_found")} (V{referrerLevel})
            </div>
          )}
          {status === "done" && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "#22c55e" }}>
              <CheckCircle2 size={12} /> {t("register.success")}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          {(status === "valid" || status === "registering") ? (
            <button
              className="w-full py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              onClick={handleRegister}
              disabled={status === "registering"}
            >
              {status === "registering" ? (
                <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> {t("register.registering")}</span>
              ) : t("register.confirm_bind")}
            </button>
          ) : (
            <button
              className="w-full py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              onClick={handleCheck}
              disabled={!refInput.trim() || status === "checking"}
            >
              {status === "checking" ? (
                <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> {t("register.checking")}</span>
              ) : t("register.verify_referrer")}
            </button>
          )}

          <button
            className="w-full py-3 rounded-xl font-bold text-sm transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            onClick={() => { if (wallet) disconnect(wallet); }}
          >
            {t("register.disconnect_and_retry")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppRouter() {
  const [location] = useLocation();
  const account = useActiveAccount();

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

  // Connected but not registered → show referrer input (auto-fill if ?ref= exists)
  if (!memberCheck) {
    return <ReferralInputPage />;
  }

  // Connected and registered → enter platform
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
