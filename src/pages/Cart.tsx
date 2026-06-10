import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCheckBadges } from "@/hooks/useCheckBadges";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Minus, ShoppingBag, Loader2, Phone, CheckCircle2, XCircle, Clock, Ticket, X } from "lucide-react";
import { useOrderPaymentToasts } from "@/hooks/useOrderPaymentToasts";
import PaymentStatusBadge from "@/components/payments/PaymentStatusBadge";

type PaymentState = "idle" | "creating_order" | "stk_sent" | "polling" | "completed" | "failed";

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();
  const { user } = useAuth();
  const { checkBadges } = useCheckBadges();
  const navigate = useNavigate();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ discount: number; description: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const orderIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime + polling fallback for the active order's payment row.
  const { snapshot: paymentSnapshot, transport, reconnect } = usePaymentStatus(activeOrderId);
  useOrderPaymentToasts(activeOrderId, paymentSnapshot);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(p);

  // React to realtime payment-state changes (in-page UI; toasts handled by the hook above).
  useEffect(() => {
    if (!paymentSnapshot || !activeOrderId) return;
    if (paymentSnapshot.status === "completed") {
      setPaymentState("completed");
      setPaymentMessage(`Payment confirmed! Receipt: ${paymentSnapshot.mpesa_receipt_number ?? "received"}`);
      clearCart();
      checkBadges();
      const oid = activeOrderId;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => navigate(`/orders/${oid}`), 2500);
    } else if (paymentSnapshot.status === "failed") {
      setPaymentState("failed");
      setPaymentMessage(paymentSnapshot.result_description || "Payment was not completed.");
    }
  }, [paymentSnapshot, activeOrderId, clearCart, checkBadges, navigate]);

  // Hard timeout after 120s if Realtime never delivers a terminal state.
  useEffect(() => {
    if (paymentState !== "stk_sent" && paymentState !== "polling") return;
    const t = setTimeout(() => {
      setPaymentState((s) => {
        if (s === "stk_sent" || s === "polling") {
          setPaymentMessage("Payment timed out. Check your M-Pesa messages and contact support if debited.");
          return "failed";
        }
        return s;
      });
    }, 120_000);
    return () => clearTimeout(t);
  }, [paymentState]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError("");
    setCouponResult(null);
    const { data, error } = await supabase.rpc("apply_coupon", {
      _code: couponCode,
      _order_total: total,
    });
    if (error) {
      setCouponError(error.message);
    } else if ((data as any)?.error) {
      setCouponError((data as any).error);
    } else {
      setCouponResult({ discount: (data as any).discount, description: (data as any).description || "" });
    }
    setApplyingCoupon(false);
  };

  const finalTotal = couponResult ? Math.max(total - couponResult.discount, 0) : total;

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
      total_amount: finalTotal,
      delivery_address: address,
      delivery_phone: phone,
      notes: notes || null,
      coupon_code: couponResult ? couponCode.toUpperCase().trim() : null,
      discount_amount: couponResult?.discount ?? 0,
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
      body: { orderId: order.id, phone, amount: finalTotal },
    });

    if (stkError || stkData?.error) {
      const msg = stkData?.error || stkError?.message || "M-Pesa request failed";
      setPaymentState("failed");
      setPaymentMessage(msg);
      toast({ title: "M-Pesa error", description: msg, variant: "destructive" });
      return;
    }

    setPaymentMessage("Check your phone for the M-Pesa prompt. Enter your PIN to pay.");

    // Fire-and-forget pending-payment email (idempotent server-side)
    supabase.functions.invoke("send-order-status-email", {
      body: {
        orderId: order.id,
        orderStatus: "payment_pending",
        customerName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer",
        totalAmount: finalTotal,
        deliveryAddress: address,
        userId: user.id,
      },
    }).catch(() => { /* non-blocking */ });

    // Switch to "polling" state and hand off to realtime hook via activeOrderId.
    setPaymentState("polling");
    setActiveOrderId(order.id);
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
    setCouponError("");
  };

  const resetPayment = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPaymentState("idle");
    setPaymentMessage("");
    setActiveOrderId(null);
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
              {/* Coupon Code */}
              <div className="space-y-2">
                {couponResult ? (
                  <div className="flex items-center justify-between rounded-lg bg-accent p-3">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <div>
                        <span className="text-sm font-medium text-accent-foreground">{couponCode.toUpperCase()}</span>
                        <p className="text-xs text-muted-foreground">-{formatPrice(couponResult.discount)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={removeCoupon} disabled={isProcessing}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.slice(0, 20))}
                      disabled={isProcessing}
                      className="uppercase"
                    />
                    <Button variant="outline" onClick={applyCoupon} disabled={!couponCode.trim() || isProcessing || applyingCoupon}>
                      {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {couponError && <p className="text-xs text-destructive">{couponError}</p>}
              </div>

              <div className="border-t pt-4 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>{formatPrice(total)}</span>
                </div>
                {couponResult && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>Discount</span><span>-{formatPrice(couponResult.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display text-lg font-bold text-foreground">
                  <span>Total</span><span>{formatPrice(finalTotal)}</span>
                </div>
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
                      {paymentState === "failed" && ""}
                    </span>
                    {activeOrderId && (paymentState === "stk_sent" || paymentState === "polling") && (
                      <PaymentStatusBadge transport={transport} onReconnect={reconnect} className="ml-auto" />
                    )}
                    <span className="hidden">{/* keep original label group below */}
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
                    : `Pay ${formatPrice(finalTotal)} via M-Pesa`}
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
