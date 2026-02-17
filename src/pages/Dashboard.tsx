import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/hooks/useAuth";
import ImpactStats from "@/components/dashboard/ImpactStats";
import UserOrders from "@/components/dashboard/UserOrders";
import RewardsCard from "@/components/dashboard/RewardsCard";
import CollectionTracker from "@/components/collections/CollectionTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const { user, role } = useAuth();

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
