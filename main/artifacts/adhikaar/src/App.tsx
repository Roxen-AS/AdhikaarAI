import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
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
              <Route path="/" component={ChatPage} />
              <Route path="/auth" component={AuthPage} />
              <Route path="/lawyers" component={LawyerDirectory} />
              <Route path="/lawyer/dashboard" component={LawyerDashboard} />
              <Route path="/connections" component={CitizenConnections} />
              <Route path="/wallet" component={WalletPage} />
            </Switch>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
