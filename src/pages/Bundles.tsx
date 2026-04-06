import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useBundles } from "@/hooks/useBundles";
import { useCart } from "@/hooks/useCart";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, ShoppingCart, Check } from "lucide-react";

export default function Bundles() {
  const { data: bundles, isLoading } = useBundles();
  const { addItem } = useCart();

  const handleAddBundle = (bundle: NonNullable<typeof bundles>[number]) => {
    bundle.items.forEach((item) => {
      addItem(item.product as any, item.quantity);
    });
    toast({
      title: "Bundle added to cart",
      description: `All ${bundle.items.length} items from "${bundle.name}" added to your cart.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Product Bundles</h1>
          <p className="mt-1 text-muted-foreground">
            Save more with our curated equipment + compost packages
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !bundles?.length ? (
          <div className="py-20 text-center text-muted-foreground">
            <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No bundles available right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {bundles.map((bundle) => (
              <Card key={bundle.id} className="flex flex-col overflow-hidden">
                {bundle.image_url && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={bundle.image_url}
                      alt={bundle.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl">{bundle.name}</CardTitle>
                    <Badge className="shrink-0 bg-primary/10 text-primary hover:bg-primary/20">
                      Save {bundle.discount_percent}%
                    </Badge>
                  </div>
                  <CardDescription>{bundle.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Includes
                    </p>
                    {bundle.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                        <span>
                          {item.quantity > 1 && `${item.quantity}× `}
                          {item.product.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        KES {bundle.discountedTotal.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        KES {bundle.originalTotal.toLocaleString()}
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleAddBundle(bundle)}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add Bundle to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
