import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Recycle, TrendingUp, Leaf, Hash } from "lucide-react";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-accent via-background to-background py-20 lg:py-32">
      <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-secondary/10 blur-3xl" />

      <div className="container relative">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-xl"
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Leaf className="h-4 w-4" />
                Kenya's Composting Champion
              </div>
              <Link to="/ussd" className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/20 transition-colors">
                <Hash className="h-4 w-4" />
                Dial *384*555#
              </Link>
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Turning Waste Into{" "}
              <span className="text-primary">Wealth</span> for Kenya
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              We deliver premium composting equipment, schedule waste collection from your doorstep, and supply lab-certified organic compost — all orderable via website, WhatsApp, or USSD *384*555# from any phone in Kenya.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2 text-base" asChild>
                <Link to="/products">
                  Start Composting Today <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
                <Link to="/collections">Schedule Free Collection</Link>
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6">
              {[
                { icon: Recycle, value: "2,500+", label: "Units Deployed" },
                { icon: TrendingUp, value: "47", label: "Counties" },
                { icon: Leaf, value: "80%", label: "Waste Reduction" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="text-center"
                >
                  <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative mx-auto aspect-square max-w-md rounded-3xl bg-gradient-to-br from-primary/20 via-accent to-secondary/20 p-8">
              <div className="flex h-full flex-col items-center justify-center gap-6 rounded-2xl border border-border/50 bg-card/80 p-8 backdrop-blur-sm">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                  <Recycle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">Complete Ecosystem</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Equipment → Collection → Composting → Marketplace → Impact Tracking
                </p>
                <div className="flex gap-2">
                  {["Aerobin", "RVM", "Compost"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
