import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";

import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import CarDetail from "@/pages/car-detail";
import Bookings from "@/pages/bookings";
import Favorites from "@/pages/favorites";
import Messages from "@/pages/messages";
import MessageDetail from "@/pages/message-detail";
import Account from "@/pages/account";
import BecomeHost from "@/pages/become-host";
import HostDashboard from "@/pages/host-dashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/cars/:id" component={CarDetail} />
      
      {/* Protected Routes */}
      <ProtectedRoute path="/bookings" component={Bookings} />
      <ProtectedRoute path="/favorites" component={Favorites} />
      <ProtectedRoute path="/messages" component={Messages} />
      <ProtectedRoute path="/messages/:id" component={MessageDetail} />
      <ProtectedRoute path="/account" component={Account} />
      <ProtectedRoute path="/become-host" component={BecomeHost} />
      <ProtectedRoute path="/host-dashboard" component={HostDashboard} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
