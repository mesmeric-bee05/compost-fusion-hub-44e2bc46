import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductCard from "../ProductCard";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useWishlist", () => ({
  useWishlist: () => ({ wishlistIds: [], toggleWishlist: vi.fn(), isToggling: false }),
}));
vi.mock("@/hooks/useCompare", () => ({
  useCompare: () => ({ isComparing: () => false, toggle: vi.fn(), count: 0 }),
}));

const baseProduct = {
  id: "1",
  name: "Bokashi Bin",
  slug: "bokashi-bin",
  category: "composters",
  short_description: "Indoor composter",
  description: "",
  price: 2500,
  currency: "KES",
  stock_quantity: 10,
  is_active: true,
  image_url: null,
  gallery: [],
  bulk_discount_percent: 0,
  specifications: {},
  created_at: "",
  updated_at: "",
} as any;

function renderCard(product = baseProduct) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProductCard product={product} onAddToCart={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ProductCard", () => {
  it("renders product name and price", () => {
    renderCard();
    expect(screen.getByText("Bokashi Bin")).toBeInTheDocument();
    expect(screen.getByText(/2,500/)).toBeInTheDocument();
  });

  it("falls back to a curated image when image_url is null", () => {
    renderCard();
    const img = screen.getByAltText(/Bokashi Bin — Captain Compost/i) as HTMLImageElement;
    expect(img.src).toMatch(/unsplash\.com/);
  });

  it("shows low stock warning when <= 5", () => {
    renderCard({ ...baseProduct, stock_quantity: 3 });
    expect(screen.getByText(/Only 3 left/i)).toBeInTheDocument();
  });

  it("disables the add button when out of stock", () => {
    renderCard({ ...baseProduct, stock_quantity: 0 });
    expect(screen.getByRole("button", { name: /sold out/i })).toBeDisabled();
  });

  it("exposes accessible compare button", () => {
    renderCard();
    expect(screen.getByRole("button", { name: /add to compare/i })).toBeInTheDocument();
  });

  it("respects prefers-reduced-motion via matchMedia stub", () => {
    // matchMedia is stubbed in src/test/setup.ts to return matches:false;
    // ensure the component renders without throwing under that contract.
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    expect(typeof mql.matches).toBe("boolean");
    renderCard();
    expect(screen.getByText("Bokashi Bin")).toBeInTheDocument();
  });
});
