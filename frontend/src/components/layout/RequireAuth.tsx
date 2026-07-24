import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/api/auth";

export function RequireAuth({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, isAuthenticated, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (adminOnly && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
