import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, type ComponentType } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ChatPage from "@/pages/chat-page";
import LawyerDirectory from "@/pages/lawyer-directory";
import AuthPage from "@/pages/auth-page";
import LawyerDashboard from "@/pages/lawyer-dashboard";
import CitizenConnections from "@/pages/citizen-connections";
import WalletPage from "@/pages/wallet-page";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/auth");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <Component />;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation(user.role === "lawyer" ? "/lawyer/dashboard" : "/");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return <AuthPage />;
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Switch>
              <Route path="/auth" component={AuthRoute} />
              <Route path="/" component={() => <ProtectedRoute component={ChatPage} />} />
              <Route path="/lawyers" component={() => <ProtectedRoute component={LawyerDirectory} />} />
              <Route path="/lawyer/dashboard" component={() => <ProtectedRoute component={LawyerDashboard} />} />
              <Route path="/connections" component={() => <ProtectedRoute component={CitizenConnections} />} />
              <Route path="/wallet" component={() => <ProtectedRoute component={WalletPage} />} />
            </Switch>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
