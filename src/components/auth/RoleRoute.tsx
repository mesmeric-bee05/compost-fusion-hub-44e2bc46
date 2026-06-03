import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Props {
  role: AppRole | AppRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RoleRoute({ role, children, redirectTo = "/dashboard" }: Props) {
  const { user, role: userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const allowed = Array.isArray(role) ? role : [role];
  if (!userRole || !allowed.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
