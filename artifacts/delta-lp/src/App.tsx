import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { WalletProvider } from "@/hooks/use-wallet";

import Positions from "@/pages/positions";
import CreateLP from "@/pages/create-lp";
import Automation from "@/pages/automation";
import ActivityView from "@/pages/activity";
import PositionDetail from "@/pages/position-detail";
import Docs from "@/pages/docs";

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <AppLayout>
        <Switch>
          <Route path="/" component={Positions} />
          <Route path="/create" component={CreateLP} />
          <Route path="/automation" component={Automation} />
          <Route path="/activity" component={ActivityView} />
          <Route path="/docs" component={Docs} />
          <Route path="/positions/:id" component={PositionDetail} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
