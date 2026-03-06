import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import ProductReviews from "@/components/reviews/ProductReviews";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart, ArrowLeft, Leaf } from "lucide-react";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = useProduct(slug || "");
  const { addItem } = useCart();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(price);

  if (isLoading) return (
    <div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>
  );

  if (!product) return (
    <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center"><p className="text-muted-foreground">Product not found</p><Button asChild className="mt-4"><Link to="/products">Back to Products</Link></Button></div></div>
  );

  const specs = product.specifications as Record<string, any> | null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/products"><ArrowLeft className="mr-2 h-4 w-4" />Back to Products</Link>
        </Button>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-xl bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center"><Leaf className="h-20 w-20 text-muted-foreground/30" /></div>
            )}
          </div>
          <div>
            <Badge variant="secondary" className="mb-2 uppercase">{product.category}</Badge>
            <h1 className="font-display text-3xl font-bold text-foreground">{product.name}</h1>
            <p className="mt-2 text-muted-foreground">{product.short_description}</p>
            <div className="mt-4 font-display text-3xl font-bold text-primary">{formatPrice(product.price)}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}
            </div>
            <Button className="mt-6 w-full sm:w-auto" size="lg" disabled={product.stock_quantity <= 0} onClick={() => {
              addItem(product);
              toast({ title: "Added to cart", description: `${product.name} added.` });
            }}>
              <ShoppingCart className="mr-2 h-5 w-5" />Add to Cart
            </Button>
            {product.description && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold">Description</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              </div>
            )}
            {specs && Object.keys(specs).length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold">Specifications</h2>
                <dl className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(specs).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-muted p-3">
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                      <dd className="mt-1 text-sm font-medium text-foreground">{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
