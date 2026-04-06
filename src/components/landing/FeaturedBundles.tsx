import { Link } from "react-router-dom";
import { useBundles } from "@/hooks/useBundles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeaturedBundles() {
  const { data: bundles, isLoading } = useBundles();

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-10">Curated Bundles</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!bundles?.length) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-3">
            <Package className="mr-1 h-3 w-3" /> Save More
          </Badge>
          <h2 className="text-3xl font-bold">Curated Bundles</h2>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            Get everything you need in one package — equipment, compost, and training at discounted prices.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {bundles.slice(0, 3).map((bundle) => (
            <Card key={bundle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {bundle.image_url && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={bundle.image_url}
                    alt={bundle.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{bundle.name}</h3>
                  <Badge className="bg-primary/10 text-primary border-0 shrink-0">
                    Save {bundle.discount_percent}%
                  </Badge>
                </div>
                {bundle.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{bundle.description}</p>
                )}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xl font-bold text-primary">
                    KES {bundle.discountedTotal.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    KES {bundle.originalTotal.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bundle.items.length} item{bundle.items.length !== 1 ? "s" : ""} included
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button asChild variant="outline" size="lg">
            <Link to="/bundles">
              View All Bundles <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
