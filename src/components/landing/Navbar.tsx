import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, X, Leaf, ShoppingCart, Heart, User, LayoutDashboard, LogOut, Settings, Shield, Truck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";
import NotificationCenter from "@/components/notifications/NotificationCenter";

const navLinks = [
  { label: "Products", href: "/products" },
  { label: "Collections", href: "/collections" },
  { label: "Education", href: "/education" },
  { label: "Community", href: "/community" },
  { label: "About", href: "/about" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Captain<span className="text-primary">Compost</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user && (
            <>
              <NotificationCenter />
              <Button variant="ghost" size="icon" asChild>
                <Link to="/wishlist"><Heart className="h-5 w-5" /></Link>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/cart">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]">{count}</Badge>
              )}
            </Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/dashboard" className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" />Dashboard</Link></DropdownMenuItem>
                {role === "admin" && <DropdownMenuItem asChild><Link to="/admin" className="flex items-center gap-2"><Shield className="h-4 w-4" />Admin</Link></DropdownMenuItem>}
                {role === "driver" && <DropdownMenuItem asChild><Link to="/driver" className="flex items-center gap-2"><Truck className="h-4 w-4" />My Tasks</Link></DropdownMenuItem>}
                <DropdownMenuItem asChild><Link to="/profile" className="flex items-center gap-2"><Settings className="h-4 w-4" />Profile</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2"><LogOut className="h-4 w-4" />Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild><Link to="/auth">Log in</Link></Button>
              <Button asChild><Link to="/auth?tab=signup">Get Started</Link></Button>
            </>
          )}
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent">
                {link.label}
              </Link>
            ))}
            <Link to="/cart" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent">
              Cart {count > 0 && `(${count})`}
            </Link>
            <div className="mt-4 flex flex-col gap-2">
              {user ? (
                <>
                  <Button variant="outline" asChild><Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link></Button>
                  <Button variant="ghost" onClick={() => { signOut(); setMobileOpen(false); }}>Sign Out</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild><Link to="/auth">Log in</Link></Button>
                  <Button asChild><Link to="/auth?tab=signup">Get Started</Link></Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
