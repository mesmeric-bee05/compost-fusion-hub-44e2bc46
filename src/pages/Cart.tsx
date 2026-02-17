import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Minus, ShoppingBag, Loader2 } from "lucide-react";

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const formatPrice = (p: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(p);

  const handleCheckout = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!address.trim() || !phone.trim()) {
      toast({ title: "Missing info", description: "Please provide delivery address and phone.", variant: "destructive" });
      return;
    }
    setCheckingOut(true);
    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      total_amount: total,
      delivery_address: address,
      delivery_phone: phone,
      notes: notes || null,
    }).select().single();

    if (error || !order) {
      toast({ title: "Order failed", description: error?.message || "Unknown error", variant: "destructive" });
      setCheckingOut(false);
      return;
    }

    const orderItems = items.map(i => ({
      order_id: order.id,
      product_id: i.product.id,
      quantity: i.quantity,
      unit_price: i.product.price,
      total_price: i.product.price * i.quantity,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    setCheckingOut(false);
    if (itemsError) {
      toast({ title: "Error saving items", description: itemsError.message, variant: "destructive" });
      return;
    }
    clearCart();
    toast({ title: "Order placed!", description: `Order #${order.id.slice(0, 8)} confirmed.` });
    navigate("/dashboard");
  };

  if (!items.length) return (
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <h1 className="mb-6 font-display text-3xl font-bold">Shopping Cart</h1>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map(item => (
              <Card key={item.product.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted" />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{item.product.name}</h3>
                    <p className="text-sm text-muted-foreground">{formatPrice(item.product.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="w-24 text-right font-medium">{formatPrice(item.product.price * item.quantity)}</div>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.product.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Checkout</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Delivery address" value={address} onChange={e => setAddress(e.target.value)} />
              <Input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
              <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
              <div className="flex justify-between border-t pt-4 font-display text-lg font-bold">
                <span>Total</span><span>{formatPrice(total)}</span>
              </div>
              <Button className="w-full" size="lg" onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {user ? "Place Order" : "Sign in to Checkout"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
