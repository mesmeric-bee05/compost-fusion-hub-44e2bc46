import { useState } from "react";
import { X, Truck } from "lucide-react";
import { Link } from "react-router-dom";

const AnnouncementBanner = () => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("announcement-dismissed") === "true";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("announcement-dismissed", "true");
    } catch {}
  };

  return (
    <div className="relative bg-primary text-primary-foreground">
      <div className="container flex items-center justify-center gap-2 py-2 text-center text-sm font-medium">
        <Truck className="h-4 w-4 shrink-0" />
        <span>
          🚚 FREE delivery on Aerobin orders above KSh 75,000 this month!
        </span>
        <Link
          to="/products"
          className="ml-2 underline underline-offset-2 hover:no-underline"
        >
          Shop Now →
        </Link>
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-primary-foreground/20 transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
