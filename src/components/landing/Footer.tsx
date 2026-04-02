import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

const Footer = () => {
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
              Partnered with MyEcoLoop to deliver sustainable waste management solutions across Kenya. Dial <strong>*384*555#</strong> to order from any phone.
            </p>
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
              <li><a href="tel:+254700000000" className="hover:text-primary">+254 700 000 000</a></li>
              <li><Link to="/contact" className="hover:text-primary">Contact Form</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Captain Compost × MyEcoLoop. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
