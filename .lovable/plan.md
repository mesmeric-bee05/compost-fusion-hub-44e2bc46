

# Plan: Product Bundles Page & Continued Project Enhancement

## Overview
Add a curated Product Bundles page where customers can purchase pre-packaged equipment + compost combinations at discounted prices. Bundles are stored in a new database table and rendered on a dedicated `/bundles` page with "Add All to Cart" functionality.

## 1. Database: `product_bundles` Table

**Migration:**
```sql
CREATE TABLE public.product_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  discount_percent numeric NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  UNIQUE(bundle_id, product_id)
);

ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active bundles
CREATE POLICY "Anyone can view active bundles" ON product_bundles FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage bundles" ON product_bundles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view bundle items" ON bundle_items FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage bundle items" ON bundle_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
```

**Seed 3 bundles** (via insert tool after migration):
1. **Home Starter Kit** — Aerobin 200L + Compost 5kg (15% off)
2. **Farm Pro Bundle** — Aerobin 400L + Compost 50kg + Training (20% off)
3. **School Green Package** — Aerobin 200L + RVM + Compost 20kg (10% off)

## 2. New Hook: `src/hooks/useBundles.ts`

- `useBundles()` — fetches active bundles with their items joined to products
- Query: `product_bundles` → `bundle_items` → `products` (nested select)
- Returns bundle name, description, image, discount, total original price, discounted price, and product list

## 3. New Page: `src/pages/Bundles.tsx`

- Grid of bundle cards, each showing:
  - Bundle image, name, description
  - List of included products with quantities
  - Original price (strikethrough) vs discounted price
  - Savings badge ("Save 15%")
  - "Add Bundle to Cart" button (adds all products to cart)
- Navbar + Footer layout consistent with Products page
- Empty state if no bundles

## 4. Route & Navigation Updates

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/bundles` route |
| `src/components/landing/Navbar.tsx` | Add "Bundles" link in Shop dropdown or nav |

## 5. Files Summary

| Action | File |
|--------|------|
| Migration | Create `product_bundles` + `bundle_items` tables with RLS |
| Seed | Insert 3 bundles + their items |
| Create | `src/hooks/useBundles.ts` |
| Create | `src/pages/Bundles.tsx` |
| Edit | `src/App.tsx` — add route |
| Edit | `src/components/landing/Navbar.tsx` — add nav link |

## Implementation Order
1. Run migration (tables + RLS)
2. Seed 3 bundles with product references
3. Create useBundles hook
4. Create Bundles page
5. Add route and navigation

