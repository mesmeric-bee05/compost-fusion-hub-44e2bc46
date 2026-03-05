import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin, Calendar, Trash2, CheckCircle2, Package, Truck, Phone } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type CollectionStatus = Database["public"]["Enums"]["collection_status"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

const collectionStatusColor: Record<CollectionStatus, string> = {
  requested: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  collected: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const orderStatusColor: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const formatKES = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

export default function DriverDashboard() {
  const { user, role, loading } = useAuth();
  const qc = useQueryClient();

  // Collection tasks
  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ["driver-collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_requests")
        .select("*")
        .eq("driver_id", user!.id)
        .order("pickup_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Delivery orders assigned to this driver
  const { data: deliveryOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["driver-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("driver_id", user!.id)
        .in("status", ["confirmed", "shipped"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markCollected = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("collection_requests")
        .update({ status: "collected" as CollectionStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-collections"] });
      toast({ title: "Marked as collected!" });
    },
  });

  const updateDeliveryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;

      // Trigger SMS notification
      const { data: order } = await supabase.from("orders").select("delivery_phone, total_amount, user_id").eq("id", id).single();
      if (order?.delivery_phone) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", order.user_id).single();
        const name = profile?.full_name || "Customer";
        const msgs: Record<string, string> = {
          shipped: `Hi ${name}, your Captain Compost order #${id.slice(0, 8).toUpperCase()} is out for delivery! 🚚`,
          delivered: `Hi ${name}, your Captain Compost order #${id.slice(0, 8).toUpperCase()} has been delivered! Thank you! ✅🌱`,
        };
        if (msgs[status]) {
          supabase.functions.invoke("send-sms-notification", {
            body: { phone: order.delivery_phone, message: msgs[status] },
          }).catch(console.warn);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-orders"] });
      toast({ title: "Delivery status updated & customer notified!" });
    },
    onError: (err) => {
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    },
  });

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (role !== "driver") return <Navigate to="/dashboard" replace />;

  const pendingCollections = collections?.filter((c) => c.status !== "collected" && c.status !== "cancelled") ?? [];
  const completedCollections = collections?.filter((c) => c.status === "collected") ?? [];
  const isLoading = collectionsLoading || ordersLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Driver Dashboard</h1>
        <p className="mb-6 text-muted-foreground">
          {pendingCollections.length} active collections · {deliveryOrders?.length ?? 0} deliveries
        </p>

        {isLoading && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />}

        <Tabs defaultValue="deliveries" className="mt-4">
          <TabsList>
            <TabsTrigger value="deliveries">
              <Truck className="mr-2 h-4 w-4" />Deliveries ({deliveryOrders?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="collections">
              <Trash2 className="mr-2 h-4 w-4" />Collections ({pendingCollections.length})
            </TabsTrigger>
          </TabsList>

          {/* Delivery Orders Tab */}
          <TabsContent value="deliveries" className="mt-4">
            {!deliveryOrders?.length && !ordersLoading && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No deliveries assigned yet.</CardContent></Card>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deliveryOrders?.map((order) => (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className={orderStatusColor[order.status] || ""}>{order.status}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                    </div>
                    <CardTitle className="text-base mt-2">{formatKES(Number(order.total_amount))}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {order.delivery_address && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span className="text-foreground">{order.delivery_address}</span>
                      </div>
                    )}
                    {order.delivery_phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span className="text-foreground">{order.delivery_phone}</span>
                      </div>
                    )}
                    {order.notes && (
                      <p className="text-xs text-muted-foreground italic">"{order.notes}"</p>
                    )}

                    {order.status === "confirmed" && (
                      <Button
                        className="mt-3 w-full"
                        size="sm"
                        onClick={() => updateDeliveryStatus.mutate({ id: order.id, status: "shipped" })}
                        disabled={updateDeliveryStatus.isPending}
                      >
                        <Truck className="mr-2 h-4 w-4" />Mark as Shipped
                      </Button>
                    )}
                    {order.status === "shipped" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="mt-3 w-full" size="sm" variant="default">
                            <CheckCircle2 className="mr-2 h-4 w-4" />Mark as Delivered
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
                            <AlertDialogDescription>
                              Mark order #{order.id.slice(0, 8)} to "{order.delivery_address}" as delivered?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => updateDeliveryStatus.mutate({ id: order.id, status: "delivered" })}>
                              Confirm Delivery
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Collections Tab */}
          <TabsContent value="collections" className="mt-4">
            {!collections?.length && !collectionsLoading && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No collection tasks assigned yet.</CardContent></Card>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collections?.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className={collectionStatusColor[c.status as CollectionStatus]}>{c.status}</Badge>
                      <span className="capitalize text-xs font-medium text-muted-foreground">{c.waste_type}</span>
                    </div>
                    <CardTitle className="text-base mt-2">{c.address}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(c.pickup_date), "MMM d, yyyy")}
                      {c.pickup_time && ` at ${c.pickup_time}`}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      {c.estimated_volume_kg ? `${c.estimated_volume_kg} kg` : "Volume not specified"}
                    </div>
                    {c.notes && <p className="text-xs text-muted-foreground italic">"{c.notes}"</p>}

                    {(c.status === "scheduled" || c.status === "requested") && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="mt-3 w-full" size="sm">
                            <CheckCircle2 className="mr-2 h-4 w-4" />Mark as Collected
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Collection</AlertDialogTitle>
                            <AlertDialogDescription>
                              Mark this pickup at "{c.address}" as collected?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => markCollected.mutate(c.id)}>
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
