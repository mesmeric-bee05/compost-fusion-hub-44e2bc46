import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import UssdSessionsTable from "@/components/admin/UssdSessionsTable";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft } from "lucide-react";

export default function AdminUssdSessions() {
  const { role, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin"><ChevronLeft className="h-4 w-4 mr-1" />Back to dashboard</Link>
          </Button>
          <h1 className="font-display text-3xl font-bold">USSD Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Inspect live and recent USSD calls, including state transitions for debugging the menu flow.
          </p>
        </div>
        <UssdSessionsTable />
      </div>
      <Footer />
    </div>
  );
}
