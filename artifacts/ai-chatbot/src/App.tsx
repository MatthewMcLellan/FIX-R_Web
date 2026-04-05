import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { ChatArea } from "@/pages/chat";
import { ServersPage } from "@/pages/servers";
import { SettingsPage } from "@/pages/settings";
import { AccountPage } from "@/pages/account";
import { LoginPage } from "@/pages/login";
import { SignupPage } from "@/pages/signup";
import { HistoryPage } from "@/pages/history";
import { AuthProvider } from "@/lib/auth";
import { AdminDashboard } from "@/pages/admin/index";
import { AdminUsers } from "@/pages/admin/users";
import { AdminAccessCodes } from "@/pages/admin/access-codes";
import { AdminAnnouncements } from "@/pages/admin/announcements";
import { AdminActivity } from "@/pages/admin/activity";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={ChatArea} />
            <Route path="/history" component={HistoryPage} />
            <Route path="/servers" component={ServersPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/account" component={AccountPage} />
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin/users" component={AdminUsers} />
            <Route path="/admin/access-codes" component={AdminAccessCodes} />
            <Route path="/admin/announcements" component={AdminAnnouncements} />
            <Route path="/admin/activity" component={AdminActivity} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
