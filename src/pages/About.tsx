import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Leaf, Users, Globe, Handshake } from "lucide-react";

const team = [
  { name: "Captain Compost", role: "Agricultural Waste Management", desc: "Pioneering organic waste-to-compost solutions across Kenya" },
  { name: "MyEcoLoop", role: "Equipment & Technology", desc: "Reverse Vending Machines and IoT-enabled waste collection" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold text-foreground">About Us</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Captain Compost × MyEcoLoop is a unified platform dedicated to transforming waste management in Kenya through 
            innovative composting technology, smart recycling equipment, and community-driven sustainability.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {team.map(t => (
            <div key={t.name} className="rounded-xl bg-card p-6 shadow-sm">
              <h3 className="font-display text-xl font-bold text-foreground">{t.name}</h3>
              <p className="text-sm font-medium text-primary">{t.role}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Leaf, title: "Our Mission", desc: "To divert 100,000 tonnes of waste from Kenyan landfills by 2030 through composting and recycling." },
            { icon: Globe, title: "Our Vision", desc: "A circular economy where every piece of waste has value and every community benefits." },
            { icon: Handshake, title: "Our Values", desc: "Sustainability, innovation, community empowerment, and environmental stewardship." },
          ].map(v => (
            <div key={v.title} className="rounded-xl bg-accent/50 p-6 text-center">
              <v.icon className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-3 font-display text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
