import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Collections from "./pages/Collections";
import Dashboard from "./pages/Dashboard";
import Education from "./pages/Education";
import Community from "./pages/Community";
import About from "./pages/About";
import Profile from "./pages/Profile";
import OrderTracking from "./pages/OrderTracking";
import Wishlist from "./pages/Wishlist";
import Compare from "./pages/Compare";
import NotificationPreferences from "./pages/NotificationPreferences";
import Onboarding from "./pages/Onboarding";
import Leaderboard from "./pages/Leaderboard";
import Bookmarks from "./pages/Bookmarks";
import Ussd from "./pages/Ussd";
import Contact from "./pages/Contact";
import Faq from "./pages/Faq";
import Bundles from "./pages/Bundles";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import WhatsAppButton from "./components/WhatsAppButton";

// Lazy-load heavy admin / driver bundles
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));
const AdminUssdSessions = lazy(() => import("./pages/AdminUssdSessions"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WhatsAppButton />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/bundles" element={<Bundles />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/education" element={<Education />} />
            <Route path="/community" element={<Community />} />
            <Route path="/about" element={<About />} />
            <Route path="/ussd" element={<Ussd />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/audit-log" element={<ProtectedRoute><AdminAuditLog /></ProtectedRoute>} />
            <Route path="/admin/ussd-sessions" element={<ProtectedRoute><AdminUssdSessions /></ProtectedRoute>} />
            <Route path="/driver" element={<ProtectedRoute><DriverDashboard /></ProtectedRoute>} />
            <Route path="/orders/:orderId" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
            <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="/notification-preferences" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
