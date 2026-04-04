import { ShoppingBag, Truck, Recycle, Sprout } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: ShoppingBag,
    title: "Order",
    description: "Browse and order composters, compost, or schedule waste collection online or via USSD.",
  },
  {
    icon: Truck,
    title: "Collect",
    description: "We pick up your organic waste from your doorstep or deliver your equipment directly.",
  },
  {
    icon: Recycle,
    title: "Compost",
    description: "Waste is transformed into nutrient-rich organic compost using proven technology.",
  },
  {
    icon: Sprout,
    title: "Grow",
    description: "Use premium compost to grow healthier crops, gardens, and a greener future.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From waste to value in four simple steps
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connector line - desktop only */}
          <div className="absolute left-0 right-0 top-12 hidden h-0.5 bg-border lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "100px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Number badge + icon */}
                <div className="relative z-10 mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-10 w-10 text-primary" />
                  <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                </div>

                <h3 className="font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
