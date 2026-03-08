import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Package, CreditCard, Truck, CheckCircle2, XCircle, Clock, MapPin, Phone, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import StatusTimeline from "@/components/orders/StatusTimeline";

const ORDER_STEPS = ["pending", "confirmed", "shipped", "delivered"] as const;

const stepMeta: Record<string, { label: string; icon: typeof Package; description: string }> = {
  pending: { label: "Order Placed", icon: Clock, description: "Your order has been received" },
  confirmed: { label: "Confirmed", icon: CreditCard, description: "Payment verified & order confirmed" },
  shipped: { label: "Shipped", icon: Truck, description: "Your order is on its way" },
  delivered: { label: "Delivered", icon: CheckCircle2, description: "Successfully delivered" },
};

const formatPrice = (p: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(p);

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  const { data: items } = useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*, products(name, image_url)")
        .eq("order_id", orderId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  const { data: payment } = useQuery({
    queryKey: ["order-payment", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  // Realtime subscription for order status updates
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          setRealtimeStatus((payload.new as { status: string }).status);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const currentStatus = realtimeStatus || order?.status || "pending";
  const isCancelled = currentStatus === "cancelled";
  const activeStepIndex = ORDER_STEPS.indexOf(currentStatus as typeof ORDER_STEPS[number]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-20 text-center">
          <h2 className="font-display text-xl font-semibold text-foreground">Order not found</h2>
          <Button asChild className="mt-4"><Link to="/dashboard">Back to Dashboard</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-4xl py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link>
        </Button>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-sm text-muted-foreground">
              Placed on {new Date(order.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {isCancelled ? (
            <Badge variant="destructive" className="text-sm"><XCircle className="mr-1 h-4 w-4" />Cancelled</Badge>
          ) : (
            <Badge className="bg-primary/10 text-primary text-sm capitalize">{currentStatus}</Badge>
          )}
        </div>

        {/* Status Timeline */}
        {!isCancelled && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-lg">Delivery Progress</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                {ORDER_STEPS.map((step, i) => {
                  const meta = stepMeta[step];
                  const Icon = meta.icon;
                  const isActive = i <= activeStepIndex;
                  const isCurrent = i === activeStepIndex;
                  return (
                    <div key={step} className="flex flex-1 flex-col items-center text-center relative">
                      {/* Connecting line */}
                      {i > 0 && (
                        <div className={`absolute top-5 right-1/2 w-full h-0.5 -z-10 ${
                          i <= activeStepIndex ? "bg-primary" : "bg-border"
                        }`} />
                      )}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground scale-110 shadow-lg"
                          : isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`mt-2 text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {meta.label}
                      </span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground hidden sm:block max-w-[100px]">
                        {meta.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status History Timeline */}
        <StatusTimeline orderId={orderId!} />


          {/* Order Items */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Items</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items?.map((item) => {
                const product = item.products as { name: string; image_url: string | null } | null;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {product?.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><Package className="h-5 w-5 text-muted-foreground/40" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{product?.name || "Product"}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.unit_price)}</p>
                    </div>
                    <span className="text-sm font-medium text-foreground">{formatPrice(item.total_price)}</span>
                  </div>
                );
              })}
              <Separator />
              <div className="flex justify-between font-display font-bold">
                <span>Total</span>
                <span>{formatPrice(order.total_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Delivery Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Payment</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {payment ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="font-medium text-foreground">M-Pesa</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={payment.status === "completed" ? "default" : "secondary"} className="capitalize">
                        {payment.status}
                      </Badge>
                    </div>
                    {payment.mpesa_receipt_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Receipt</span>
                        <span className="font-mono text-foreground">{payment.mpesa_receipt_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="text-foreground">{payment.phone_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-bold text-foreground">{formatPrice(payment.amount)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No payment record found</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Delivery</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.delivery_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{order.delivery_address}</span>
                  </div>
                )}
                {order.delivery_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{order.delivery_phone}</span>
                  </div>
                )}
                {order.notes && (
                  <div className="mt-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    <strong>Notes:</strong> {order.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
