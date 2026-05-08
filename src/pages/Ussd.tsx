import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, ShoppingCart, Trophy, MapPin, Lightbulb, HeadphonesIcon } from "lucide-react";
import ussdHero from "@/assets/ussd-feature-phone.jpg";

const menuItems = [
  { icon: ShoppingCart, label: "Shop Products", desc: "Browse composters, compost & services" },
  { icon: Trophy, label: "My Eco-Points", desc: "Check your reward balance" },
  { icon: MapPin, label: "Track Order", desc: "Get real-time delivery updates" },
  { icon: Lightbulb, label: "Compost Tips", desc: "Daily sustainability tips" },
  { icon: HeadphonesIcon, label: "Contact Support", desc: "Reach our team instantly" },
];

const Ussd = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container py-16">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground">
            Order via <span className="text-primary">USSD</span>
          </h1>
          <img
            src={ussdHero}
            alt="Smiling Kenyan woman using a feature phone in a busy market"
            width={1024}
            height={1024}
            loading="lazy"
            className="mt-6 mb-2 h-56 w-full rounded-2xl border border-border object-cover shadow-md"
          />
          <p className="mt-4 text-lg text-muted-foreground">
            No smartphone? No internet? No problem. Dial <strong>*384*555#</strong> from any phone to browse products, check eco-points, track orders, and pay with M-Pesa — all without data.
          </p>
          <div className="mt-8 space-y-4">
            {menuItems.map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phone simulator */}
        <div className="flex justify-center">
          <div className="w-72 rounded-[2.5rem] border-4 border-foreground/20 bg-eco-deep p-4 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-foreground/30" />
            <div className="rounded-2xl bg-background p-4 font-mono text-sm">
              <p className="text-primary font-bold mb-2">Captain Compost</p>
              <p className="text-foreground mb-3">Welcome! Choose an option:</p>
              <div className="space-y-1 text-foreground/80">
                <p>1. Shop Products</p>
                <p>2. My Eco-Points</p>
                <p>3. Track Order</p>
                <p>4. Compost Tips</p>
                <p>5. Contact Support</p>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                <div className="flex-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">Enter 1-5</div>
                <div className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground">Send</div>
              </div>
            </div>
            <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-foreground/20" />
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Ussd;
