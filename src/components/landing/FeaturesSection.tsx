import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Truck, BarChart3, BookOpen, Trophy, Building2 } from "lucide-react";

const features = [
  {
    icon: ShoppingBag,
    title: "E-Commerce Marketplace",
    description: "Aerobin composters, RVMs, and premium compost products — delivered across Kenya.",
  },
  {
    icon: Truck,
    title: "Waste Collection",
    description: "Schedule pickups for organic, recyclable, and agricultural waste with real-time tracking.",
  },
  {
    icon: BarChart3,
    title: "Impact Dashboard",
    description: "Track your environmental impact — waste diverted, CO₂ saved, and compost produced.",
  },
  {
    icon: BookOpen,
    title: "Education Hub",
    description: "Guides, courses, and video content on composting, recycling, and sustainable farming.",
  },
  {
    icon: Trophy,
    title: "Rewards & Gamification",
    description: "Earn points, climb leaderboards, and unlock badges for your eco-friendly actions.",
  },
  {
    icon: Building2,
    title: "Enterprise Portal",
    description: "Multi-location management, ESG reports, and bulk ordering for institutions.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="bg-background py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            One Platform, Complete Sustainability
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to manage waste, create compost, and build a greener future.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="group h-full border-border/50 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent transition-colors group-hover:bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
