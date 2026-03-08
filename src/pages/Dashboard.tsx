import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ImpactStats from "@/components/dashboard/ImpactStats";
import UserOrders from "@/components/dashboard/UserOrders";
import RewardsCard from "@/components/dashboard/RewardsCard";
import CollectionTracker from "@/components/collections/CollectionTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data && !data.onboarding_completed) {
          navigate("/onboarding", { replace: true });
        } else {
          setChecking(false);
        }
      });
  }, [user, navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back{user?.email ? `, ${user.email}` : ""}</p>
        </div>
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><ImpactStats /></div>
          <RewardsCard />
        </div>
        <Tabs defaultValue="collections">
          <TabsList>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>
          <TabsContent value="collections" className="mt-4"><CollectionTracker /></TabsContent>
          <TabsContent value="orders" className="mt-4"><UserOrders /></TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
