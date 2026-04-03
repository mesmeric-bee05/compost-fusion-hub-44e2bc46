

# Plan: Testimonials Section, Product Images Fix & Full Quality Pass

## Overview
This plan addresses the screenshot issue (products showing without images), adds a testimonials section to the landing page, and ensures all features work correctly.

## 1. Fix Missing Product Images

The 7 recently-seeded products (OWC Industrial, Compost 5kg, Compost 20kg, and 4 services) have `NULL` image_url values — visible as blank cards with just a Leaf icon on the Products page (as shown in the screenshot).

**Fix:** Since we can't upload real product photos, generate professional placeholder images using a gradient + icon approach directly in the `ProductCard` component — but more importantly, update the database records with appropriate placeholder URLs or use Unsplash/placeholder images for each product category.

**Migration:** Update the 7 products with curated free-use image URLs (from Unsplash or similar) matching their categories:
- OWC Industrial → industrial composting machine image
- Compost 5kg/20kg → organic soil/compost bags
- Services (subscription, training, sub-agent, ESG) → relevant service imagery

## 2. Add Testimonials Section to Landing Page

**New file: `src/components/landing/TestimonialsSection.tsx`**
- Hardcoded testimonials (since no review data exists yet) from realistic Kenyan customer personas:
  - Smallholder farmer from Kiambu
  - Hotel manager from Mombasa  
  - County waste officer from Nakuru
  - Home gardener from Nairobi
- Each card: avatar placeholder (initials), name, role, location, star rating, quote
- Animated with framer-motion
- Responsive grid: 1 col mobile, 2 col tablet, 4 col desktop

**Edit: `src/pages/Index.tsx`**
- Import and add `TestimonialsSection` between `ProductHighlights` and `CTASection`

## 3. FeaturesSection framer-motion Fix

The `FeaturesSection` still uses `whileInView` without `amount: 0` — same visibility bug pattern as ProductHighlights had. Fix by adding `viewport={{ once: true, amount: 0 }}` to ensure cards render.

## 4. Security & Quality Pass

- Run security linter to check for RLS gaps
- Ensure the `contact_submissions` table has proper RLS (insert-only for public)
- Verify all Dialog components have `DialogDescription`

## Database Migration

```sql
-- Update product images for the 7 seeded products missing images
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1616628188540-...' 
WHERE slug = 'owc-industrial';
-- (similar for each product)
```

## Files to Create
| File | Purpose |
|------|---------|
| `src/components/landing/TestimonialsSection.tsx` | Customer testimonials with ratings |

## Files to Edit
| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Add TestimonialsSection |
| `src/components/landing/FeaturesSection.tsx` | Fix `whileInView` viewport config |

## Implementation Order
1. Run migration to add product images for 7 missing products
2. Create TestimonialsSection component
3. Add to Index.tsx landing page
4. Fix FeaturesSection animation
5. Run security linter and fix any issues

