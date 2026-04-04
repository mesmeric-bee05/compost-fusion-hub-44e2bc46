import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Leaf } from "lucide-react";
import { motion } from "framer-motion";

const ProductHighlights = () => {
  const { data: products = [] } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="bg-muted/50 py-20">
      <div className="container">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">Featured Products</h2>
            <p className="mt-2 text-muted-foreground">Premium composting equipment & organic products</p>
          </div>
          <Button variant="ghost" className="gap-2" asChild>
            <Link to="/products">
              View All Products <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "100px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Link to={`/products/${product.slug}`}>
              <Card className="group h-full overflow-hidden border-border/50 transition-all hover:shadow-lg">
                  <div className="aspect-[4/3] bg-gradient-to-br from-accent to-muted flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <Leaf className="h-12 w-12 text-primary/20" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs capitalize">{product.category}</Badge>
                      {product.stock_quantity > 0 ? (
                        <span className="text-xs text-muted-foreground">In Stock</span>
                      ) : (
                        <span className="text-xs text-destructive">Out of Stock</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display font-semibold text-foreground">{product.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.short_description || product.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-display font-bold text-primary">{product.currency} {Number(product.price).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductHighlights;
