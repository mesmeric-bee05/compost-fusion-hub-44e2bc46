import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEO from "../SEO";

function renderSEO(props: React.ComponentProps<typeof SEO>) {
  return render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>
  );
}

describe("SEO", () => {
  it("sets title, description, and canonical", async () => {
    renderSEO({
      title: "Captain Compost — Test Page",
      description: "Composting for Kenya.",
      canonicalPath: "/test",
    });
    await waitFor(() => {
      expect(document.title).toBe("Captain Compost — Test Page");
      expect(document.querySelector('meta[name="description"]')?.getAttribute("content"))
        .toBe("Composting for Kenya.");
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("/test");
    });
  });

  it("truncates over-long titles and descriptions", async () => {
    renderSEO({
      title: "x".repeat(120),
      description: "y".repeat(300),
    });
    await waitFor(() => {
      expect(document.title.length).toBeLessThanOrEqual(60);
      const desc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
      expect(desc.length).toBeLessThanOrEqual(160);
    });
  });

  it("renders JSON-LD when provided", async () => {
    renderSEO({
      title: "T",
      description: "D",
      jsonLd: { "@context": "https://schema.org", "@type": "Organization", name: "Captain Compost" },
    });
    await waitFor(() => {
      const ld = document.querySelector('script[type="application/ld+json"]');
      expect(ld?.textContent).toContain("Captain Compost");
    });
  });
});
