import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Leaf } from "lucide-react";
import type { Product } from "@/hooks/useProducts";

interface Props {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: Props) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(price);

  const outOfStock = product.stock_quantity <= 0;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      <Link to={`/products/${product.slug}`}>
        <div className="aspect-[4/3] overflow-hidden bg-muted relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Leaf className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">{product.category}</span>
          {!outOfStock && product.stock_quantity <= 5 && (
            <span className="text-xs font-medium text-destructive">Only {product.stock_quantity} left</span>
          )}
        </div>
        <Link to={`/products/${product.slug}`}>
          <h3 className="mb-1 font-display text-base font-semibold leading-tight text-foreground hover:text-primary transition-colors">{product.name}</h3>
        </Link>
        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{product.short_description}</p>
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-bold text-foreground">{formatPrice(product.price)}</span>
          <Button
            size="sm"
            disabled={outOfStock}
            onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            {outOfStock ? "Sold Out" : "Add"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
