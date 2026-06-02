import AnnouncementBanner from "@/components/landing/AnnouncementBanner";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ProductHighlights from "@/components/landing/ProductHighlights";
import FeaturedBundles from "@/components/landing/FeaturedBundles";
import StatsCounterSection from "@/components/landing/StatsCounterSection";
import CTASection from "@/components/landing/CTASection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import Footer from "@/components/landing/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Captain Compost — Kenya's Composting & Waste Loop"
        description="Order composters, schedule organic-waste pickups, and earn rewards across Kenya. KES pricing, M-Pesa checkout."
        canonicalPath="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Captain Compost",
          url: "/",
          telephone: "+254700116655",
          areaServed: "KE",
        }}
      />
      <AnnouncementBanner />
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ProductHighlights />
        <FeaturedBundles />
        <TestimonialsSection />
        <StatsCounterSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
