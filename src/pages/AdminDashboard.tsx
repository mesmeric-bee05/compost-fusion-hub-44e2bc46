import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AdminStats from "@/components/admin/AdminStats";
import RevenueChart from "@/components/admin/RevenueChart";
import OrdersTable from "@/components/admin/OrdersTable";
import CollectionsTable from "@/components/admin/CollectionsTable";
import UsersTable from "@/components/admin/UsersTable";
import CouponsManager from "@/components/admin/CouponsManager";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutDashboard, ShoppingCart, Recycle, Users, Ticket, BarChart3 } from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "collections", label: "Collections", icon: Recycle },
  { id: "users", label: "Users", icon: Users },
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

type Tab = typeof tabs[number]["id"];

export default function AdminDashboard() {
  const { role, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <h1 className="mb-6 font-display text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t.id)}
            >
              <t.icon className="mr-2 h-4 w-4" />
              {t.label}
            </Button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <AdminStats />
            <RevenueChart />
          </div>
        )}
        {tab === "orders" && <OrdersTable />}
        {tab === "collections" && <CollectionsTable />}
        {tab === "users" && <UsersTable />}
        {tab === "coupons" && <CouponsManager />}
        {tab === "analytics" && <AnalyticsDashboard />}
      </div>
      <Footer />
    </div>
  );
}
