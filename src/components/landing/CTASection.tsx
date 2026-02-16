import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf } from "lucide-react";

const CTASection = () => {
  return (
    <section className="bg-primary py-20">
      <div className="container text-center">
        <Leaf className="mx-auto mb-6 h-10 w-10 text-primary-foreground/80" />
        <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
          Join the Composting Revolution
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-primary-foreground/80">
          Whether you're a household, farmer, or institution — start turning waste into wealth today.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="secondary" className="gap-2 text-base" asChild>
            <Link to="/auth?tab=signup">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base" asChild>
            <Link to="/about">Learn More</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
