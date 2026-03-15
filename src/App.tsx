import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThirdwebProvider, useActiveAccount } from "thirdweb/react";
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
        <Route>{() => { window.location.href = "/admin/dashboard"; return null; }}</Route>
      </Switch>
    </AdminLayout>
  );
}

function AppRouter() {
  const [location] = useLocation();
  const account = useActiveAccount();

  if (location === "/admin") {
    return <AdminLogin />;
  }
  if (location.startsWith("/admin/")) {
    return <AdminRoutes />;
  }
  // Must connect wallet to enter platform
  if (!account?.address) {
    return <LandingPage />;
  }
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
