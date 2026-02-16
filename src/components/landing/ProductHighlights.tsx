import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const products = [
  {
    name: "Aerobin 200L",
    category: "Composter",
    price: "KES 45,000",
    description: "Compact insulated composter for households. Odour-free, pest-free composting.",
    badge: "Best Seller",
  },
  {
    name: "Aerobin 400L",
    category: "Composter",
    price: "KES 75,000",
    description: "Mid-size composter for small farms and estates. Dual-chamber design.",
    badge: "Popular",
  },
  {
    name: "Aerobin 600L",
    category: "Composter",
    price: "KES 110,000",
    description: "Large-scale composter for institutions and commercial operations.",
    badge: "Enterprise",
  },
  {
    name: "Premium Compost",
    category: "Compost",
    price: "KES 500/bag",
    description: "Nutrient-rich, lab-tested organic compost for farming and gardening.",
    badge: "New",
  },
];

const ProductHighlights = () => {
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
              key={product.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className="group h-full overflow-hidden border-border/50 transition-all hover:shadow-lg">
                <div className="aspect-[4/3] bg-gradient-to-br from-accent to-muted flex items-center justify-center">
                  <div className="text-4xl font-display font-bold text-primary/20">
                    {product.category === "Composter" ? "🏗️" : "🌱"}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">{product.badge}</Badge>
                    <span className="text-xs text-muted-foreground">{product.category}</span>
                  </div>
                  <h3 className="mt-2 font-display font-semibold text-foreground">{product.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-display font-bold text-primary">{product.price}</span>
                    <Button size="sm" variant="outline" className="text-xs">Add to Cart</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductHighlights;
