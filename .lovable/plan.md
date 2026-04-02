

# Comprehensive Project Enhancement: Fixes, Content Seeding, USSD Integration & Master Prompt Alignment

## Overview

This plan addresses the immediate bugs (Featured Products visibility, empty Education page), seeds sample content, and begins aligning the project with the master specification — adding USSD ordering, brand identity updates, missing product catalog items, and additional pages from the spec.

---

## Phase 1: Immediate Fixes

### 1A. Featured Products Visibility (framer-motion fix)
The `ProductHighlights.tsx` uses `whileInView` with `initial={{ opacity: 0 }}`, which can fail when the section loads within the viewport (IntersectionObserver never fires). Fix by switching to `animate` with `useInView` hook, or simply using `animate` instead of `whileInView` for the initial render, or adding `amount: 0` to viewport config.

**Fix:** Change `whileInView` to `animate` or add `viewport={{ once: true, amount: 0 }}` to ensure cards appear immediately when in view.

### 1B. Seed Educational Content
Insert 6 sample articles into the `content` table via database migration:
1. "How to Start Composting at Home in Kenya" (composting, article)
2. "Liquid vs Chemical Fertilizer: What Farmers Need to Know" (agriculture, article)
3. "Reverse Vending Machines: Kenya's Recycling Revolution" (recycling, article)
4. "Vermicomposting: A Beginner's Guide" (composting, guide)
5. "Sustainable Farming Practices for Kenyan Smallholders" (agriculture, article)
6. "Reducing Food Waste: Tips for Restaurants and Hotels" (waste-management, article)

Each with full markdown body (500+ words), category, slug, `is_published = true`.

---

## Phase 2: Product Catalog Expansion (from Master Spec)

The spec requires additional products not yet in the database:
- Organic Waste Composter (OWC) — Industrial, custom quote
- Premium Organic Compost 5kg — KES 850
- Premium Organic Compost 20kg — KES 2,800
- Monthly Compost Subscription — service
- Composting Advisory & Training — service
- Sub-Agent Onboarding Kit — service
- Corporate ESG Audit Package — service

**Migration:** Insert these as new products with appropriate categories (add `industrial`, `services` categories). Update `ProductHighlights` to show featured products (composters + compost).

---

## Phase 3: USSD Integration (Edge Function)

Create a `ussd-handler` edge function that implements the Africa's Talking USSD webhook:

**Edge function: `supabase/functions/ussd-handler/index.ts`**
- Receives POST with `sessionId`, `serviceCode`, `phoneNumber`, `text`
- Implements the full menu tree from the spec:
  - Main Menu → Shop Products → Category → Product → Order (M-Pesa STK)
  - My Eco-Points → balance lookup by phone
  - Track Order → by order number
  - Compost Tips → rotating tips
  - Contact Support → info display
- Returns `CON` (continue) or `END` (terminate) prefixed plain text
- Uses Supabase client for DB queries (products, orders, rewards)
- Triggers M-Pesa STK push for orders via the existing `initiate-mpesa-payment` function

**Database:** Create `ussd_sessions` table to track session state:
```sql
CREATE TABLE public.ussd_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  menu_state text DEFAULT 'MAIN',
  session_data jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Frontend: USSD Info Page (`/ussd`)**
- New page explaining the USSD service
- Interactive phone simulator component showing the menu tree
- Steps: Dial → Browse → Select → Pay → Confirm

---

## Phase 4: Brand Identity Alignment

Update the design to match the master spec colors:
- Primary: `#6dbf3e` (accent green)
- Deep Background: `#0d2b1a` (forest dark)
- Earth: `#8b5e3c`
- Cream: `#f6f0e6`

**Files:** Update `tailwind.config.ts` CSS variables and `index.css` to align with spec colors.

**Hero Section:** Update to match spec:
- Add USSD quick-order pill: "Dial *384*555#"
- Update stats to match spec values (2,500+ Units Deployed, 47 Counties, 80% Waste Reduction)
- Add partner strip below hero

**Footer:** Expand to include all spec links, social media, contact channels, USSD code.

---

## Phase 5: Missing Pages from Spec

### 5A. USSD Service Page (`/ussd`)
- Explanation of USSD ordering (left column)
- Interactive phone simulator (right column) — CSS phone mockup with clickable menu

### 5B. Contact Page (`/contact`)
- Contact form (name, phone, email, interest dropdown, county, message)
- Contact channel cards (WhatsApp, Email, Call, USSD)
- Saves to a `contact_submissions` table

### 5C. FAQ Page (`/faq`)
- Accordion-based FAQ using existing shadcn Accordion component
- Categories: Ordering, Composting, Delivery, M-Pesa, USSD

---

## Phase 6: Security Hardening

- Add `DialogDescription` to all Dialog components missing it
- Ensure `profiles` table has INSERT policy (for trigger-based creation)
- Add rate limiting headers to edge functions
- Validate all form inputs with Zod schemas
- Ensure no API keys exposed in client code

---

## Database Migration Summary

Single migration covering:
1. 6 educational articles (INSERT into `content`)
2. 7 new products (INSERT into `products`)
3. `ussd_sessions` table (CREATE)
4. `contact_submissions` table (CREATE + RLS)

## Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/ussd-handler/index.ts` | USSD webhook handler |
| `src/pages/Ussd.tsx` | USSD info + simulator page |
| `src/pages/Contact.tsx` | Contact page with form |
| `src/pages/Faq.tsx` | FAQ page |
| `src/components/ussd/UssdPhoneSimulator.tsx` | Interactive phone mockup |

## Files to Edit
| File | Changes |
|------|---------|
| `src/components/landing/ProductHighlights.tsx` | Fix framer-motion visibility |
| `src/components/landing/HeroSection.tsx` | Add USSD pill, update stats, partner strip |
| `src/components/landing/Footer.tsx` | Expand with spec links/contacts |
| `src/components/landing/Navbar.tsx` | Add USSD, Contact links |
| `src/App.tsx` | Add `/ussd`, `/contact`, `/faq` routes |
| `tailwind.config.ts` | Update brand colors |
| `src/index.css` | Update CSS variables |
| `src/pages/Index.tsx` | Add new homepage sections |

## Implementation Order
1. Fix ProductHighlights visibility + seed articles (immediate wins)
2. Expand product catalog
3. Brand color alignment
4. USSD edge function + page
5. Contact + FAQ pages
6. Hero/Footer updates
7. Security hardening pass

