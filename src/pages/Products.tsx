import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ProductCard from "@/components/products/ProductCard";
import ProductFilters from "@/components/products/ProductFilters";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useCompare } from "@/hooks/useCompare";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, GitCompareArrows } from "lucide-react";

export default function Products() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useProducts(category, search);
  const { addItem } = useCart();
  const { count: compareCount } = useCompare();

  const handleAdd = (product: any) => {
    addItem(product);
    toast({ title: "Added to cart", description: `${product.name} added to your cart.` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Products</h1>
          <p className="mt-1 text-muted-foreground">Composters, equipment, and organic compost products</p>
        </div>
        <ProductFilters category={category} onCategoryChange={setCategory} search={search} onSearchChange={setSearch} />
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !products?.length ? (
          <div className="py-20 text-center text-muted-foreground">No products found</div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map(p => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />)}
          </div>
        )}
      </main>
      {compareCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="container flex items-center justify-between py-3">
            <span className="text-sm font-medium text-foreground">
              <GitCompareArrows className="mr-2 inline h-4 w-4 text-primary" />
              {compareCount} product{compareCount > 1 ? "s" : ""} selected
            </span>
            <Button asChild size="sm"><Link to="/compare">Compare Now</Link></Button>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
