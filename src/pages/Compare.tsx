import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useCompare } from "@/hooks/useCompare";
import { supabase } from "@/integrations/supabase/client";
import { X, ArrowLeft, Leaf, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "@/hooks/use-toast";
import type { Product } from "@/hooks/useProducts";

export default function Compare() {
  const { compareIds, remove, clear } = useCompare();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    if (compareIds.length === 0) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    supabase.from("products").select("*").in("id", compareIds).then(({ data }) => {
      setProducts((data as Product[]) || []);
      setLoading(false);
    });
  }, [compareIds]);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(p);

  // Merge all specification keys
  const allSpecKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys((p.specifications as Record<string, string>) || {})))
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/products"><ArrowLeft className="mr-1 h-4 w-4" />Back to Products</Link>
            </Button>
            <h1 className="font-display text-3xl font-bold text-foreground">Compare Products</h1>
            <p className="text-muted-foreground">Compare up to 3 products side by side</p>
          </div>
          {products.length > 0 && (
            <Button variant="outline" size="sm" onClick={clear}>Clear All</Button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading...</div>
        ) : products.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20">
            <Leaf className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">No products selected for comparison</p>
            <Button asChild className="mt-4"><Link to="/products">Browse Products</Link></Button>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-40 border-b border-border p-3 text-left text-sm font-medium text-muted-foreground" />
                  {products.map((p) => (
                    <th key={p.id} className="min-w-[220px] border-b border-border p-3">
                      <div className="relative">
                        <button onClick={() => remove(p.id)} className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20">
                          <X className="h-3 w-3" />
                        </button>
                        <div className="mx-auto mb-3 aspect-[4/3] w-40 overflow-hidden rounded-lg bg-muted">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center"><Leaf className="h-8 w-8 text-muted-foreground/40" /></div>
                          )}
                        </div>
                        <Link to={`/products/${p.slug}`} className="font-display text-sm font-semibold text-foreground hover:text-primary">{p.name}</Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row label="Price">{products.map((p) => <td key={p.id} className="border-b border-border p-3 text-center font-display text-lg font-bold text-foreground">{formatPrice(p.price)}</td>)}</Row>
                <Row label="Category">{products.map((p) => <td key={p.id} className="border-b border-border p-3 text-center"><Badge variant="secondary">{p.category}</Badge></td>)}</Row>
                <Row label="Stock">{products.map((p) => <td key={p.id} className="border-b border-border p-3 text-center text-sm">{p.stock_quantity > 0 ? <span className="text-primary">{p.stock_quantity} available</span> : <span className="text-destructive">Out of stock</span>}</td>)}</Row>
                <Row label="Bulk Discount">{products.map((p) => <td key={p.id} className="border-b border-border p-3 text-center text-sm text-muted-foreground">{p.bulk_discount_percent ? `${p.bulk_discount_percent}%` : "—"}</td>)}</Row>
                {allSpecKeys.map((key) => (
                  <Row key={key} label={key}>
                    {products.map((p) => (
                      <td key={p.id} className="border-b border-border p-3 text-center text-sm text-muted-foreground">
                        {(p.specifications as Record<string, string>)?.[key] || "—"}
                      </td>
                    ))}
                  </Row>
                ))}
                <Row label="Description">{products.map((p) => <td key={p.id} className="border-b border-border p-3 text-center text-xs text-muted-foreground">{p.short_description || "—"}</td>)}</Row>
                <tr>
                  <td className="p-3" />
                  {products.map((p) => (
                    <td key={p.id} className="p-3 text-center">
                      <Button size="sm" disabled={p.stock_quantity <= 0} onClick={() => { addItem(p); toast({ title: "Added to cart", description: `${p.name} added.` }); }}>
                        <ShoppingCart className="mr-1 h-4 w-4" />Add to Cart
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="hover:bg-muted/50">
      <td className="border-b border-border p-3 text-sm font-medium text-muted-foreground">{label}</td>
      {children}
    </tr>
  );
}
