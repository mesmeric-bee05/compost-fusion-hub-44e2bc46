import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ProductCard from "@/components/products/ProductCard";
import ProductFilters from "@/components/products/ProductFilters";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Products() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useProducts(category, search);
  const { addItem } = useCart();

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
      <Footer />
    </div>
  );
}
