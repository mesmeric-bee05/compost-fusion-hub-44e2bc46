import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CollectionRequestForm from "@/components/collections/CollectionRequestForm";
import CollectionTracker from "@/components/collections/CollectionTracker";
import { useAuth } from "@/hooks/useAuth";
import { Recycle, Truck, Calendar, Leaf } from "lucide-react";

const features = [
  { icon: Recycle, title: "All Waste Types", desc: "Organic, recyclable, agricultural, and mixed waste" },
  { icon: Truck, title: "Door-to-Door", desc: "We come to you — homes, farms, and institutions" },
  { icon: Calendar, title: "Flexible Scheduling", desc: "One-time or recurring weekly, bi-weekly, monthly" },
  { icon: Leaf, title: "Impact Tracking", desc: "See your environmental impact grow over time" },
];

export default function Collections() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Waste Collection Service</h1>
          <p className="mt-2 text-muted-foreground">Schedule pickups for your organic and recyclable waste</p>
        </div>
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(f => (
            <div key={f.title} className="flex items-start gap-3 rounded-xl bg-card p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <CollectionRequestForm />
          {user && (
            <div>
              <h2 className="mb-4 font-display text-xl font-semibold">Your Collections</h2>
              <CollectionTracker />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
