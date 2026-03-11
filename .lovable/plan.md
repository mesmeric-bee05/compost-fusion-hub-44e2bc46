

# Full Platform Build: End-to-End Fixes, Product Images, Admin Dashboard, Driver Dashboard

This plan addresses all four requests in sequence, building each feature in full depth.

---

## Part 1: End-to-End Fixes

Several issues were identified during testing:

### 1A. Missing `auth.users` trigger
The `handle_new_user()` function exists but the trigger connecting it to `auth.users` may not be properly attached. A migration will ensure the trigger is created (using `CREATE OR REPLACE` / `IF NOT EXISTS` pattern) so that every signup automatically creates entries in `profiles`, `user_roles`, and `rewards`.

### 1B. Product images missing
All 10 products currently have `NULL` for `image_url`. Products display placeholder leaf icons instead of real images. This will be fixed in Part 2.

### 1C. RLS policy verification
All collection_requests policies are confirmed PERMISSIVE (not RESTRICTIVE), so users can create/view their own collections correctly. No changes needed.

---

## Part 2: Product Images via AI Generation

Generate product images using the Lovable AI image generation API (google/gemini-2.5-flash-image), then store them in a Supabase storage bucket and update product records.

**Implementation:**
1. Create a `product-images` storage bucket (public, for product catalog images)
2. Create an edge function `generate-product-images` that:
   - For each product category (composters, equipment, compost, accessories), generates a professional product photo using the AI image API
   - Converts the base64 result to a file and uploads to the storage bucket
   - Updates the product's `image_url` in the database
3. Call the edge function once to populate all product images
4. Update `ProductCard` and `ProductDetail` components to properly display storage URLs

**Products and their image prompts:**
- Aerobin 200L/400L/600L: "Professional product photo of a green insulated aerobic composter bin, [size] liters, on white background"
- RVM Standard/Pro: "Professional product photo of a modern reverse vending machine for recycling, digital display, on white background"
- Compost 25kg/50kg: "Professional product photo of a bag of premium organic compost, [weight], on white background"
- Vermicompost: "Professional product photo of a bag of vermicompost worm castings, 10kg, on white background"
- Starter Kit: "Professional product photo of a composting starter kit with thermometer and guidebook, on white background"
- Bio-Enzyme: "Professional product photo of a bottle of bio-enzyme composting activator, 1 liter, on white background"

---

## Part 3: Admin Dashboard

A comprehensive admin dashboard accessible only to users with the `admin` role.

**New files:**
- `src/pages/AdminDashboard.tsx` -- Main admin page with sidebar layout
- `src/components/admin/AdminStats.tsx` -- Summary cards (total users, orders, collections, revenue)
- `src/components/admin/RevenueChart.tsx` -- Revenue over time using Recharts (AreaChart)
- `src/components/admin/OrdersTable.tsx` -- Recent orders table with status management
- `src/components/admin/CollectionsTable.tsx` -- All collection requests with driver assignment
- `src/components/admin/UsersTable.tsx` -- User management table

**Database requirements:**
- Admin role check uses existing `has_role()` function
- Admin RLS policies already exist on all tables (ALL command for admin role)
- No schema changes needed -- admin reads are already permitted by existing policies

**Admin stats will query:**
- Total profiles count
- Total orders count and sum of `total_amount`
- Total collection requests count, broken down by status
- Orders grouped by month for the revenue chart

**Route:** `/admin` -- protected by `ProtectedRoute` + additional admin role check

**UI Layout:**
- Sidebar with navigation: Overview, Orders, Collections, Users
- Top-level summary cards with icons and KES formatting
- Revenue chart (last 6 months) using Recharts AreaChart
- Tables with status badges, sortable columns, and action buttons

---

## Part 4: Driver Dashboard

A dedicated view for users with the `driver` role to manage assigned collection tasks.

**New files:**
- `src/pages/DriverDashboard.tsx` -- Driver's main page
- `src/components/driver/AssignedCollections.tsx` -- List of assigned collection tasks with action buttons
- `src/components/driver/CollectionDetailCard.tsx` -- Expanded view of a single collection with mark-as-collected button

**Features:**
- Shows only collections where `driver_id = auth.uid()`
- Status workflow: Scheduled -> mark as "collected" with one click
- Card-based layout showing: waste type, address, date/time, volume, user notes
- Status badge with color coding
- Confirmation dialog before marking as collected
- Auto-refresh after status update

**Database requirements:**
- Existing RLS policies already allow drivers to SELECT and UPDATE their assigned collections
- Driver updates `status` to `collected` and optionally adds `verification_photo_url`

**Route:** `/driver` -- protected by `ProtectedRoute` + driver role check

---

## Part 5: App.tsx Route Updates

Add new routes to `App.tsx`:
- `/admin` -- AdminDashboard (protected, admin-only)
- `/driver` -- DriverDashboard (protected, driver-only)

Update Navbar to show role-specific links:
- Admin users see "Admin" link in the user dropdown
- Driver users see "My Tasks" link in the user dropdown

---

## Technical Summary

| Change | Type | Files |
|--------|------|-------|
| Trigger fix | DB Migration | 1 migration |
| Storage bucket | DB Migration | 1 migration |
| Image generation | Edge Function | `supabase/functions/generate-product-images/index.ts` |
| Admin dashboard | Frontend | 5 new components + 1 page |
| Driver dashboard | Frontend | 3 new components + 1 page |
| Route updates | Frontend | `App.tsx`, `Navbar.tsx` |
| Role-based guards | Frontend | New `AdminRoute.tsx`, `DriverRoute.tsx` components |

