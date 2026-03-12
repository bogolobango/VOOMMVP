import { Route, Redirect, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";

export function ProtectedRoute({ component: Component, path }: { component: any, path: string }) {
  const { data: user, isLoading } = useGetMe({ query: { retry: false } });
  const [location] = useLocation();

  return (
    <Route path={path}>
      {(params) => {
        if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
        if (!user) return <Redirect to={`/auth?redirect=${encodeURIComponent(location)}`} />;
        return <Component {...params} />;
      }}
    </Route>
  );
}
