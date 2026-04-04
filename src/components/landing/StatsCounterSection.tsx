import { useEffect, useRef, useState } from "react";
import { Recycle, Sprout, Users, TrendingUp } from "lucide-react";

interface CounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

function AnimatedCounter({ end, duration = 2000, suffix = "", prefix = "" }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <div ref={ref} className="font-display text-4xl font-extrabold text-foreground sm:text-5xl">
      {prefix}{count.toLocaleString()}{suffix}
    </div>
  );
}

const stats = [
  {
    icon: Recycle,
    value: 12500,
    suffix: "+",
    label: "Kg Waste Diverted",
    description: "Organic waste kept out of landfills",
  },
  {
    icon: Sprout,
    value: 8200,
    suffix: "+",
    label: "Kg Compost Produced",
    description: "Nutrient-rich compost created",
  },
  {
    icon: Users,
    value: 2500,
    suffix: "+",
    label: "Active Users",
    description: "Households, farms & institutions",
  },
  {
    icon: TrendingUp,
    value: 47,
    label: "Counties Reached",
    description: "Coverage across Kenya",
  },
];

const StatsCounterSection = () => {
  return (
    <section className="bg-primary py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
            Our Impact in Numbers
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Real results from our growing community of composters and recyclers.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center rounded-2xl bg-primary-foreground/10 p-6 backdrop-blur-sm"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/20">
                <stat.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              <p className="mt-2 text-sm font-semibold text-primary-foreground">
                {stat.label}
              </p>
              <p className="mt-1 text-xs text-primary-foreground/70">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsCounterSection;
