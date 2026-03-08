import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Heart, ShoppingCart, Trash2, Leaf, Loader2 } from "lucide-react";
import type { Product } from "@/hooks/useProducts";

const formatPrice = (p: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(p);

export default function Wishlist() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const qc = useQueryClient();

  const { data: wishlistItems, isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist")
        .select("id, product_id, created_at, products(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const removeFromWishlist = useMutation({
    mutationFn: async (wishlistId: string) => {
      const { error } = await supabase.from("wishlist").delete().eq("id", wishlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      toast({ title: "Removed from wishlist" });
    },
  });

  const handleAddToCart = (product: Product, wishlistId: string) => {
    if (product.stock_quantity <= 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
    addItem(product);
    removeFromWishlist.mutate(wishlistId);
    toast({ title: "Added to cart! 🛒", description: `${product.name} moved to your cart.` });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container flex flex-col items-center justify-center py-20">
          <Heart className="h-16 w-16 text-muted-foreground/40" />
          <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Sign in to view your wishlist</h2>
          <Button asChild className="mt-4"><Link to="/auth">Sign In</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-6 flex items-center gap-3">
          <Heart className="h-7 w-7 text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">My Wishlist</h1>
          {wishlistItems && wishlistItems.length > 0 && (
            <Badge variant="secondary">{wishlistItems.length} items</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !wishlistItems?.length ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart className="h-16 w-16 text-muted-foreground/30" />
            <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Your wishlist is empty</h2>
            <p className="mt-2 text-sm text-muted-foreground">Browse products and save your favorites!</p>
            <Button asChild className="mt-4"><Link to="/products">Browse Products</Link></Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {wishlistItems.map((item) => {
              const product = item.products as unknown as Product;
              if (!product) return null;
              const outOfStock = product.stock_quantity <= 0;
              return (
                <Card key={item.id} className="group overflow-hidden transition-shadow hover:shadow-lg">
                  <Link to={`/products/${product.slug}`}>
                    <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><Leaf className="h-12 w-12 text-muted-foreground/40" /></div>
                      )}
                      {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                          <Badge variant="destructive">Out of Stock</Badge>
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-primary">{product.category}</span>
                    <Link to={`/products/${product.slug}`}>
                      <h3 className="mb-1 font-display text-base font-semibold leading-tight text-foreground hover:text-primary transition-colors">{product.name}</h3>
                    </Link>
                    <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{product.short_description}</p>
                    <div className="font-display text-lg font-bold text-foreground mb-3">{formatPrice(product.price)}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={outOfStock}
                        onClick={() => handleAddToCart(product, item.id)}
                      >
                        <ShoppingCart className="mr-1 h-4 w-4" />
                        {outOfStock ? "Sold Out" : "Add to Cart"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFromWishlist.mutate(item.id)}
                        disabled={removeFromWishlist.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
