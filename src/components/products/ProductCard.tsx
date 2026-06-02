import { Link } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, GitCompareArrows } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { useCompare } from "@/hooks/useCompare";
import { productImageFor } from "@/lib/stockImages";
import type { Product } from "@/hooks/useProducts";

interface Props {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: Props) {
  const { user } = useAuth();
  const { wishlistIds, toggleWishlist, isToggling } = useWishlist();
  const { isComparing, toggle: toggleCompare, count: compareCount } = useCompare();
  const [imgFailed, setImgFailed] = useState(false);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(price);

  const outOfStock = product.stock_quantity <= 0;
  const isWished = wishlistIds.includes(product.id);
  const imgSrc = !imgFailed && product.image_url ? product.image_url : productImageFor(product.category);

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      <Link to={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
        <div className="aspect-[4/3] overflow-hidden bg-muted relative">
          <img
            src={imgSrc}
            alt={`${product.name} — Captain Compost`}
            width={800}
            height={600}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
            </div>
          )}
          {product.bulk_discount_percent && product.bulk_discount_percent > 0 && !outOfStock && (
            <Badge className="absolute bottom-2 left-2 bg-primary text-primary-foreground">
              Bulk -{product.bulk_discount_percent}%
            </Badge>
          )}
          <button
            type="button"
            aria-label={isComparing(product.id) ? "Remove from compare" : "Add to compare"}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(product.id); }}
            className={`absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${isComparing(product.id) ? "bg-primary text-primary-foreground" : "bg-background/80 text-muted-foreground hover:bg-background"}`}
            title={isComparing(product.id) ? "Remove from compare" : compareCount >= 3 ? "Max 3 products" : "Add to compare"}
          >
            <GitCompareArrows className="h-4 w-4" />
          </button>
          {user && (
            <button
              type="button"
              aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={isWished}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product.id); }}
              disabled={isToggling}
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
            >
              <Heart className={`h-4 w-4 ${isWished ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
            </button>
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
            aria-label={outOfStock ? `${product.name} sold out` : `Add ${product.name} to cart`}
            onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
          >
            <ShoppingCart className="mr-1 h-4 w-4" aria-hidden />
            {outOfStock ? "Sold Out" : "Add"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
