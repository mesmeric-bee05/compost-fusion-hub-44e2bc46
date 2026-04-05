import { Link } from "react-router-dom";
import { Leaf, Send } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: email.trim().toLowerCase() });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "You're already subscribed!", description: "This email is already on our mailing list." });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Subscribed! 🌱", description: "You'll receive composting tips and updates." });
        setEmail("");
      }
    } catch {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="border-t border-border bg-muted/30 py-12">
      <div className="container">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Leaf className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">
                Captain<span className="text-primary">Compost</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Captain Compost is Kenya's leading provider of composting equipment, smart recycling technology, and premium organic compost products. We bring sustainable waste solutions to households, farms, schools, and businesses across all 47 counties. Dial <strong>*384*555#</strong> to order from any phone, anytime.
            </p>

            <form onSubmit={handleSubscribe} className="mt-4 flex gap-2">
              <Input
                type="email"
                placeholder="Your email for composting tips"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="max-w-[220px]"
              />
              <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                {loading ? "..." : "Subscribe"}
              </Button>
            </form>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground">Products</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/products" className="hover:text-primary">Aerobin Composters</Link></li>
              <li><Link to="/products" className="hover:text-primary">RVM Machines</Link></li>
              <li><Link to="/products" className="hover:text-primary">Organic Compost</Link></li>
              <li><Link to="/products" className="hover:text-primary">Services</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/collections" className="hover:text-primary">Waste Collection</Link></li>
              <li><Link to="/education" className="hover:text-primary">Education Hub</Link></li>
              <li><Link to="/ussd" className="hover:text-primary">USSD Ordering</Link></li>
              <li><Link to="/community" className="hover:text-primary">Community</Link></li>
              <li><Link to="/faq" className="hover:text-primary">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Nairobi, Kenya</li>
              <li><a href="mailto:info@captaincompost.co.ke" className="hover:text-primary">info@captaincompost.co.ke</a></li>
              <li><a href="tel:+254700116655" className="hover:text-primary">+254 700 116 655</a></li>
              <li><Link to="/contact" className="hover:text-primary">Contact Form</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Captain Compost. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
