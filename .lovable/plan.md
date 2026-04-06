

# Plan: Featured Bundles Section + Admin Bundle Management

## 1. Featured Bundles Landing Page Section

Create `src/components/landing/FeaturedBundles.tsx` — a section showing the 3 bundles in a compact card grid with savings badges, discounted prices, and a "View All Bundles" link to `/bundles`. Reuses the `useBundles` hook.

**Add to `src/pages/Index.tsx`** between ProductHighlights and TestimonialsSection.

## 2. Admin Bundle Management

Create `src/components/admin/BundlesManager.tsx` — full CRUD interface for bundles:
- **List view**: Table showing bundle name, discount %, item count, active status, with edit/delete actions
- **Create/Edit dialog**: Form with name, slug (auto-generated from name), description, discount %, image upload (reuses `ImageUpload` component), active toggle
- **Bundle items sub-form**: Multi-select products from existing products table, set quantity per product, add/remove items
- Uses React Query mutations for create/update/delete against `product_bundles` and `bundle_items` tables
- Pattern follows existing `ContentManager.tsx` and `CouponsManager.tsx` conventions

**Add "Bundles" tab to `src/pages/AdminDashboard.tsx`** with a `Package` icon from lucide-react, placed after "Coupons" tab.

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/landing/FeaturedBundles.tsx` | Landing page bundles preview |
| Create | `src/components/admin/BundlesManager.tsx` | Admin CRUD for bundles |
| Edit | `src/pages/Index.tsx` | Add FeaturedBundles section |
| Edit | `src/pages/AdminDashboard.tsx` | Add Bundles tab |

No database changes needed — tables and RLS already exist.

## Implementation Order
1. Create FeaturedBundles landing section
2. Add to Index.tsx
3. Create BundlesManager admin component
4. Add Bundles tab to AdminDashboard

