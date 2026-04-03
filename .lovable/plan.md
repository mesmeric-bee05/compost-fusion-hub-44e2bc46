

# Plan: How It Works Section, Missing Product Images & Quality Pass

## 1. Fix 3 Products Still Missing Images

Database query confirms 3 products have `NULL` image_url:
- `premium-organic-compost-5kg`
- `premium-organic-compost-20kg`
- `corporate-esg-audit-package`

**Migration:** Update these 3 rows with curated Unsplash image URLs:
- Compost 5kg → soil/compost close-up image
- Compost 20kg → compost bags/garden image
- ESG Audit → corporate/sustainability report image

## 2. Add "How It Works" Section

**New file: `src/components/landing/HowItWorksSection.tsx`**

Four-step horizontal timeline with icons and descriptions:
1. **Order** (ShoppingBag icon) → Browse and order composters, compost, or schedule waste collection
2. **Collect** (Truck icon) → We pick up your organic waste or deliver your equipment
3. **Compost** (Recycle icon) → Waste is transformed into nutrient-rich organic compost
4. **Grow** (Sprout icon) → Use compost to grow healthier crops and gardens

Design: Horizontal step indicators connected by a dotted line, each step as a card with icon, number badge, title, and description. Framer-motion staggered entry animation. Responsive: horizontal on desktop, vertical stack on mobile.

**Edit: `src/pages/Index.tsx`**
Insert `HowItWorksSection` between `FeaturesSection` and `ProductHighlights`:
```
Hero → Features → How It Works → Products → Testimonials → CTA
```

## 3. Files Summary

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/landing/HowItWorksSection.tsx` | 4-step process section |
| Edit | `src/pages/Index.tsx` | Add HowItWorks import + placement |
| Migration | SQL | Update 3 product image_url values |

## Implementation Order
1. Run migration to fix 3 missing product images
2. Create HowItWorksSection component
3. Add to Index.tsx landing page

