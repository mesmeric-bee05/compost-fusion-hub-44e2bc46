import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Minus, ShoppingBag, Loader2, Phone, CheckCircle2, XCircle, Clock } from "lucide-react";

type PaymentState = "idle" | "creating_order" | "stk_sent" | "polling" | "completed" | "failed";

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orderIdRef = useRef<string | null>(null);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(p);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollPaymentStatus = (orderId: string) => {
    setPaymentState("polling");
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds

    pollRef.current = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from("payments")
        .select("status, mpesa_receipt_number, result_description")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.status === "completed") {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setPaymentState("completed");
        setPaymentMessage(`Payment confirmed! Receipt: ${data.mpesa_receipt_number}`);
        clearCart();
        toast({ title: "Payment successful! 🎉", description: "Your order has been confirmed." });
        setTimeout(() => navigate("/dashboard"), 2500);
      } else if (data?.status === "failed") {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setPaymentState("failed");
        setPaymentMessage(data.result_description || "Payment was not completed.");
        toast({ title: "Payment failed", description: data.result_description || "Please try again.", variant: "destructive" });
      } else if (attempts >= maxAttempts) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setPaymentState("failed");
        setPaymentMessage("Payment timed out. Check your M-Pesa messages and contact support if debited.");
      }
    }, 2000);
  };

  const handleCheckout = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!address.trim() || !phone.trim()) {
      toast({ title: "Missing info", description: "Please provide delivery address and phone number.", variant: "destructive" });
      return;
    }

    setPaymentState("creating_order");
    setPaymentMessage("");

    // 1. Create order
    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      total_amount: total,
      delivery_address: address,
      delivery_phone: phone,
      notes: notes || null,
    }).select().single();

    if (error || !order) {
      toast({ title: "Order failed", description: error?.message || "Unknown error", variant: "destructive" });
      setPaymentState("idle");
      return;
    }

    orderIdRef.current = order.id;

    // 2. Save order items
    const orderItems = items.map(i => ({
      order_id: order.id,
      product_id: i.product.id,
      quantity: i.quantity,
      unit_price: i.product.price,
      total_price: i.product.price * i.quantity,
    }));
    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) {
      toast({ title: "Error saving items", description: itemsError.message, variant: "destructive" });
      setPaymentState("idle");
      return;
    }

    // 3. Initiate M-Pesa STK Push
    setPaymentState("stk_sent");
    setPaymentMessage("Sending payment request to your phone…");

    const { data: stkData, error: stkError } = await supabase.functions.invoke("initiate-mpesa-payment", {
      body: { orderId: order.id, phone, amount: total },
    });

    if (stkError || stkData?.error) {
      const msg = stkData?.error || stkError?.message || "M-Pesa request failed";
      setPaymentState("failed");
      setPaymentMessage(msg);
      toast({ title: "M-Pesa error", description: msg, variant: "destructive" });
      return;
    }

    setPaymentMessage("Check your phone for the M-Pesa prompt. Enter your PIN to pay.");
    pollPaymentStatus(order.id);
  };

  const resetPayment = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPaymentState("idle");
    setPaymentMessage("");
    orderIdRef.current = null;
  };

  if (!items.length && paymentState !== "completed") return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container flex flex-col items-center justify-center py-20">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="mt-4 font-display text-xl font-semibold">Your cart is empty</h2>
        <Button asChild className="mt-4"><Link to="/products">Browse Products</Link></Button>
      </main>
      <Footer />
    </div>
  );

  const isProcessing = paymentState !== "idle" && paymentState !== "failed";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <h1 className="mb-6 font-display text-3xl font-bold">Shopping Cart</h1>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="space-y-4 lg:col-span-2">
            {items.map(item => (
              <Card key={item.product.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{item.product.name}</h3>
                    <p className="text-sm text-muted-foreground">{formatPrice(item.product.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={isProcessing} onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={isProcessing} onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="w-24 text-right font-medium hidden sm:block">{formatPrice(item.product.price * item.quantity)}</div>
                  <Button variant="ghost" size="icon" disabled={isProcessing} onClick={() => removeItem(item.product.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Checkout Panel */}
          <Card>
            <CardHeader><CardTitle>Checkout via M-Pesa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Delivery address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                disabled={isProcessing}
              />
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="M-Pesa phone (e.g. 0712345678)"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <Textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={isProcessing}
              />
              <div className="flex justify-between border-t pt-4 font-display text-lg font-bold">
                <span>Total</span><span>{formatPrice(total)}</span>
              </div>

              {/* Payment Status Indicator */}
              {paymentState !== "idle" && (
                <div className={`rounded-lg p-4 text-sm ${
                  paymentState === "completed" ? "bg-accent text-accent-foreground" :
                  paymentState === "failed" ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {paymentState === "completed" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    {paymentState === "failed" && <XCircle className="h-5 w-5" />}
                    {(paymentState === "stk_sent" || paymentState === "polling" || paymentState === "creating_order") && (
                      <Clock className="h-5 w-5 animate-pulse" />
                    )}
                    <span className="font-medium">
                      {paymentState === "creating_order" && "Creating order…"}
                      {paymentState === "stk_sent" && "M-Pesa request sent"}
                      {paymentState === "polling" && "Waiting for payment…"}
                      {paymentState === "completed" && "Payment confirmed!"}
                      {paymentState === "failed" && "Payment failed"}
                    </span>
                  </div>
                  {paymentMessage && <p className="text-xs leading-relaxed">{paymentMessage}</p>}
                </div>
              )}

              {paymentState === "failed" ? (
                <Button className="w-full" size="lg" onClick={resetPayment}>
                  Try Again
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                >
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!user
                    ? "Sign in to Checkout"
                    : isProcessing
                    ? "Processing…"
                    : `Pay ${formatPrice(total)} via M-Pesa`}
                </Button>
              )}

              <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">Lipa na M-Pesa</Badge>
                <span>Secure mobile payment</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
