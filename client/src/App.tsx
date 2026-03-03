import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThirdwebProvider } from "thirdweb/react";
import { Layout } from "@/components/Layout";
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

function Router() {
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

function AdminRouter() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin/dashboard" component={Dashboard} />
        <Route path="/admin/members" component={Members} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/withdrawals" component={AdminWithdrawals} />
        <Route path="/admin/messages" component={AdminMessages} />
        <Route path="/admin/finance" component={AdminFinance} />
        <Route>{() => { window.location.href = "/admin/dashboard"; return null; }}</Route>
      </Switch>
    </AdminLayout>
  );
}

function App() {
  return (
    <ThirdwebProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/admin" component={AdminLogin} />
            <Route path="/admin/:rest*" component={AdminRouter} />
            <Route path="/:rest*" component={Router} />
          </Switch>
        </TooltipProvider>
      </QueryClientProvider>
    </ThirdwebProvider>
  );
}

export default App;
