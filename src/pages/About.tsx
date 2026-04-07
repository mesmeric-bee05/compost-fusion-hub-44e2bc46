import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, Globe, Handshake, Sprout, ShoppingBag, Truck, BookOpen, Hash, Recycle, Factory, Award, ArrowRight, Monitor } from "lucide-react";

const offerings = [
  { icon: Sprout, label: "Composting Equipment", desc: "Aerobin composters for homes, farms & institutions" },
  { icon: Recycle, label: "Smart Recycling", desc: "Reverse Vending Machines for malls, schools & offices" },
  { icon: Factory, label: "Industrial Solutions", desc: "Organic Waste Composters for large-scale operations" },
  { icon: ShoppingBag, label: "Premium Compost", desc: "Lab-certified organic compost bags in all sizes" },
  { icon: Truck, label: "Waste Collection", desc: "Scheduled doorstep collection across Kenya" },
  { icon: BookOpen, label: "Education", desc: "Composting guides, courses, and community training" },
  { icon: Hash, label: "USSD Ordering", desc: "Order from any phone, no internet needed via *384*555#" },
];

const values = [
  { icon: Leaf, emoji: "🌱", title: "Our Mission", desc: "To divert 100,000 tonnes of waste from Kenyan landfills by 2030 through accessible composting and recycling solutions." },
  { icon: Globe, emoji: "🌍", title: "Our Vision", desc: "A circular economy where every piece of Kenya's organic waste has value, every community benefits, and no resource goes to landfill." },
  { icon: Handshake, emoji: "🤝", title: "Our Values", desc: "Sustainability, innovation, community empowerment, and environmental stewardship — in everything we do." },
];

const stats = [
  { value: "12,500+", label: "Kg Waste Diverted" },
  { value: "8,200+", label: "Kg Compost Produced" },
  { value: "2,500+", label: "Active Users" },
  { value: "47", label: "Counties Reached" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold text-foreground">About Captain Compost</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Kenya's composting champion — turning organic waste into green gold for households, farms, schools, and businesses across all 47 counties.
          </p>
        </div>

        {/* Story */}
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl bg-card p-8 shadow-sm">
          <p className="text-muted-foreground leading-relaxed">
            Captain Compost was founded on a simple but powerful belief: every piece of organic waste is a resource waiting to be unlocked. We are a Kenyan composting and sustainable waste solutions company dedicated to making circular waste management accessible, affordable, and rewarding for every Kenyan — from the smallholder farmer in Eldoret to the five-star hotel in Mombasa.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We supply premium composting equipment, industrial organic waste processors, smart recycling machines, and our own lab-certified organic compost products. We also offer waste collection services, composting training, corporate ESG audits, and a loyalty rewards program that pays you back for going green.
          </p>
        </div>

        {/* Mission / Vision / Values */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="rounded-xl bg-accent/50 p-6 text-center">
              <span className="text-3xl">{v.emoji}</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-foreground">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* What We Offer */}
        <div className="mt-16">
          <h2 className="text-center font-display text-2xl font-bold text-foreground">What We Offer</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((o) => (
              <div key={o.label} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <o.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{o.label}</p>
                  <p className="text-sm text-muted-foreground">{o.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Impact Stats */}
        <div className="mt-16 rounded-2xl bg-primary p-8">
          <h2 className="text-center font-display text-2xl font-bold text-primary-foreground">Our Impact in Numbers</h2>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl font-extrabold text-primary-foreground">{s.value}</div>
                <p className="mt-1 text-sm text-primary-foreground/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Placeholder */}
        <div className="mt-16 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground">The People Behind Captain Compost</h2>
          <p className="mt-2 text-muted-foreground">Our passionate team is dedicated to Kenya's green future.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Alice", role: "Founder & CEO", icon: Award },
              { name: "Paulette Hawi", role: "Head of Operations", icon: Truck },
              { name: "Alvin Macharia", role: "Head CTO/Technician", icon: Monitor },
              { name: "Ernest Njambi", role: "Lead Agronomist", icon: Sprout },
            ].map((m) => (
              <div key={m.name} className="rounded-xl bg-card p-6 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <m.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-4 font-display font-semibold text-foreground">{m.name}</h3>
                <p className="text-sm text-muted-foreground">{m.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" className="gap-2" asChild>
            <Link to="/products">Start Composting Today <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/contact">Contact Our Team</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
