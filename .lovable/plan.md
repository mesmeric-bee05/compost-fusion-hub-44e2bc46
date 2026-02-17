

# Implementation Plan: Captain Compost x MyEcoLoop - Full Feature Build

This plan covers 5 major deliverables, built incrementally in order. Each step builds on the previous one.

---

## Phase 1: Authentication Pages (Login, Signup, Email Verification, Role Selection)

Create a full authentication system with role-based registration.

**New files to create:**
- `src/pages/Auth.tsx` -- Login/signup page with tabs
- `src/components/auth/LoginForm.tsx` -- Email + password login form
- `src/components/auth/SignupForm.tsx` -- Registration with full name, email, phone, password, and role selection (Individual, Farmer, Institution, Recycler, Driver)
- `src/components/auth/EmailVerification.tsx` -- Post-signup verification prompt
- `src/pages/ResetPassword.tsx` -- Password reset page for recovery flow
- `src/hooks/useAuth.ts` -- Auth state hook (session, user, role, loading)
- `src/components/auth/ProtectedRoute.tsx` -- Route guard for authenticated pages

**Changes to existing files:**
- `src/App.tsx` -- Add routes for `/auth`, `/reset-password`, and all new pages
- Landing Navbar -- Show user menu when logged in instead of "Log in" button

**Key details:**
- Role selection as radio buttons during signup (stored via existing `handle_new_user` trigger, which defaults to 'individual' -- we will update the trigger to accept role from user metadata)
- Database migration: Update `handle_new_user()` function to read role from `raw_user_meta_data` so signup can pass the selected role
- Email verification required (no auto-confirm)
- Forgot password flow with redirect to `/reset-password`
- Zod validation on all form inputs

---

## Phase 2: Seed Product Database

Populate the products table with real Aerobin composters, RVMs, and compost products with KES pricing.

**Products to seed (using database insert tool):**

| Product | Category | Price (KES) | Key Specs |
|---------|----------|-------------|-----------|
| Aerobin 200L Composter | composters | 45,000 | 200L capacity, household use, insulated, aerobic |
| Aerobin 400L Composter | composters | 75,000 | 400L capacity, dual-chamber, small farms |
| Aerobin 600L Composter | composters | 110,000 | 600L capacity, institutional/commercial |
| Reverse Vending Machine (RVM) Standard | equipment | 350,000 | PET bottles, aluminum cans, IoT-enabled |
| Reverse Vending Machine (RVM) Pro | equipment | 550,000 | Multi-material, touchscreen, reward system |
| Premium Organic Compost (25kg) | compost | 500 | Lab-tested, NPK balanced, certified organic |
| Premium Organic Compost (50kg) | compost | 900 | Bulk bag, farm-grade, nutrient-rich |
| Vermicompost Special Blend (10kg) | compost | 350 | Worm-cast compost, high humic acid |
| Composting Starter Kit | accessories | 2,500 | Thermometer, activator, guide booklet |
| Bio-Enzyme Activator (1L) | accessories | 800 | Speeds up composting, natural enzymes |

---

## Phase 3: Product Catalog Page

Full e-commerce catalog with filters, search, and detail pages pulling from the database.

**New files to create:**
- `src/pages/Products.tsx` -- Main catalog page with grid layout
- `src/components/products/ProductCard.tsx` -- Product card component
- `src/components/products/ProductFilters.tsx` -- Category filter sidebar/bar + search input
- `src/pages/ProductDetail.tsx` -- Full product detail page with specs, gallery, reviews, add-to-cart
- `src/hooks/useProducts.ts` -- React Query hooks for fetching products
- `src/hooks/useCart.ts` -- Shopping cart state (localStorage-based initially)
- `src/pages/Cart.tsx` -- Shopping cart page with quantity controls and checkout
- `src/components/products/ProductReviews.tsx` -- Reviews section (read/write)

**Features:**
- Category filter tabs: All, Composters, Equipment, Compost, Accessories
- Text search with debounce
- Sort by price (low-high, high-low), name, newest
- Product detail page at `/products/:slug`
- Add to cart with toast notification
- Cart page with quantity adjustment, remove items, order total in KES
- Checkout form (delivery address, phone, notes) that creates an order + order_items in the database
- Wishlist toggle (heart icon) for logged-in users

---

## Phase 4: Waste Collection System

Collection request form with scheduling and a user dashboard for tracking.

**New files to create:**
- `src/pages/Collections.tsx` -- Landing page for waste collection service
- `src/components/collections/CollectionRequestForm.tsx` -- Multi-step form: waste type, volume, address, date/time, frequency, notes
- `src/components/collections/CollectionTracker.tsx` -- Status timeline for user's requests
- `src/pages/Dashboard.tsx` -- Role-based user dashboard
- `src/components/dashboard/UserCollections.tsx` -- List of user's collection requests with status
- `src/components/dashboard/UserOrders.tsx` -- Order history
- `src/components/dashboard/ImpactStats.tsx` -- Personal impact metrics cards
- `src/components/dashboard/DriverDashboard.tsx` -- Driver-specific view (assigned tasks, mark collected)

**Features:**
- Waste type selection: Organic, Recyclable, Agricultural, Mixed
- Scheduling: one-time or recurring (weekly, bi-weekly, monthly)
- Date/time picker for preferred pickup
- Address input with notes field
- Volume estimation slider (kg)
- Status tracking: Requested -> Scheduled -> Collected -> Cancelled
- Dashboard shows all user requests with filtering by status
- Driver dashboard shows assigned collections with ability to update status

---

## Phase 5: User Dashboard, Impact Metrics & Remaining Pages

Complete the platform with dashboard, impact tracking, education hub stub, and community stub.

**New files to create:**
- `src/components/dashboard/RewardsCard.tsx` -- Points, level, badges display
- `src/components/dashboard/AdminDashboard.tsx` -- Admin overview (total users, orders, collections, revenue)
- `src/pages/Education.tsx` -- Education hub page (content library from database)
- `src/pages/Community.tsx` -- Forum posts listing
- `src/pages/About.tsx` -- About page with mission, team, partner info
- `src/pages/Profile.tsx` -- User profile settings (edit name, phone, location, language)
- `src/components/layout/DashboardLayout.tsx` -- Sidebar layout for authenticated pages

**Features:**
- Role-based dashboard routing (different views for individual, farmer, driver, admin)
- Impact metrics display with recharts (waste diverted over time, CO2 saved)
- Education page pulls published content from database
- Community forum with create/view posts
- Profile page with editable fields
- Admin dashboard with summary cards and recent activity

---

## Technical Notes

- **Database migration needed**: Update `handle_new_user()` trigger to read role from `raw_user_meta_data->>'role'` instead of always defaulting to 'individual'
- **RLS note**: All policies are already properly configured. The `collection_requests` policies use RESTRICTIVE mode which is correct.
- **Cart**: Uses localStorage for cart state (no login required to browse/add). Checkout requires authentication.
- **All forms** use react-hook-form + zod validation
- **All data fetching** uses @tanstack/react-query
- **Routing**: All new pages added to App.tsx with proper route structure
- **Security**: No sensitive operations on client side. Role checks use `has_role()` security definer function. No admin checks via localStorage.

