import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Grace Wanjiku",
    role: "Smallholder Farmer",
    location: "Kiambu County",
    initials: "GW",
    rating: 5,
    quote:
      "The Aerobin composter transformed my farm waste into rich compost in just weeks. My tomato yields have doubled since I started using Captain Compost's organic fertiliser.",
  },
  {
    name: "James Ochieng",
    role: "Hotel Operations Manager",
    location: "Mombasa",
    initials: "JO",
    rating: 5,
    quote:
      "We reduced our waste disposal costs by 60% after partnering with Captain Compost. The scheduled collections and impact reports make ESG compliance effortless.",
  },
  {
    name: "Dr. Lucy Muthoni",
    role: "County Waste Officer",
    location: "Nakuru County",
    initials: "LM",
    rating: 4,
    quote:
      "Captain Compost's RVM network has revolutionised recycling in our county. Citizens are motivated by the eco-points rewards — participation is up 300%.",
  },
  {
    name: "Peter Kamau",
    role: "Home Gardener",
    location: "Nairobi",
    initials: "PK",
    rating: 5,
    quote:
      "I ordered via USSD from my basic phone and had compost delivered to my doorstep the next day. The M-Pesa integration makes everything seamless.",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="bg-accent/30 py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Trusted by Kenyans Across 47 Counties
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See how our community is turning waste into value every day.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className="h-full border-border/50 transition-shadow hover:shadow-lg">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-primary/10">
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {t.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}, {t.location}</p>
                    </div>
                  </div>
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${s < t.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-muted-foreground">"{t.quote}"</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
