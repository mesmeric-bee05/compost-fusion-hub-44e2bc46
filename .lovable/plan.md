
# Plan: Admin Products Manager + Team Fix + Verification

## 1. Fix About Page Team Members

Update `src/pages/About.tsx` lines 100-103 to correct the team:
- Alice — Founder & CEO
- Paulette Hawi — Head of Operations
- Alvin Macharia — Head CTO/Technician
- Ernest Njambi — Lead Agronomist

Change from 3 to 4 team members, add a `Monitor` icon for the CTO role.

## 2. Admin Products Manager

Create `src/components/admin/ProductsManager.tsx` — full CRUD for products:
- **List view**: Table with product name, category, price, stock, active status, edit/delete actions
- **Create/Edit dialog**: Form with name, slug (auto-generated), short description, full description, category (select from existing categories: composters, compost, recycling, services, industrial, subscriptions), price, currency, stock quantity, image upload (reuses `ImageUpload` with `product-images` bucket), gallery, specifications (JSON editor), bulk discount %, active toggle
- React Query mutations for insert/update/delete against `products` table
- Pattern follows `CouponsManager.tsx` and `BundlesManager.tsx`

## 3. Add Products Tab to Admin Dashboard

Update `src/pages/AdminDashboard.tsx`:
- Import `ProductsManager`
- Add `{ id: "products", label: "Products", icon: ShoppingBag }` tab after "orders"
- Render `<ProductsManager />` when tab is active

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| Edit | `src/pages/About.tsx` | Fix team names to Alice, Paulette, Alvin, Ernest |
| Create | `src/components/admin/ProductsManager.tsx` | Admin CRUD for products |
| Edit | `src/pages/AdminDashboard.tsx` | Add Products tab |

No database changes needed — products table and RLS already exist.

## Implementation Order
1. Fix About page team members
2. Create ProductsManager component
3. Add Products tab to AdminDashboard
