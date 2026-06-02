# Continued Build: Polish, Security, SEO & Feature Hardening

Most items in your list are already implemented from earlier turns (M-Pesa STK + callback, admin/driver dashboards, RLS, storage buckets, product images, routes/navbar, order status emails, audit log, USSD admin, newsletter skeletons, HIBP, Resend). This plan focuses on what's still missing or needs polish.

## 1. Product card polish (real imagery + UX)
- Update `ProductCard.tsx`: graceful fallback to curated stock image from `src/lib/stockImages.ts` when `image_url` is null/broken, `onError` handler, `loading="lazy"`, `decoding="async"`, fixed aspect-ratio wrapper to kill CLS.
- Add subtle hover zoom, badge for low stock / bundle savings, accessible alt text (`{name} — Captain Compost`).
- Ensure all product pages use `<img>` with explicit width/height.

## 2. SEO hardening (site-wide)
- Add a tiny `<SEO>` helper component (`src/components/SEO.tsx`) using `react-helmet-async` to set per-page title (<60 chars), meta description (<160), canonical, OG/Twitter tags, and JSON-LD.
- Wire into: Index, Products, ProductDetail (Product schema + price + availability), Education (Article schema), Bundles, About, Contact, FAQ (FAQPage schema).
- Single H1 audit pass on landing sections.
- `public/robots.txt` and a generated `public/sitemap.xml` (static build-time script in `scripts/generate-sitemap.ts` listing public routes + products + content slugs).
- Install `react-helmet-async` and wrap App in its provider.

## 3. Accessibility & performance polish
- Add `aria-label`s to icon-only buttons across Navbar/Footer/admin tables.
- Replace any remaining raw color classes with semantic tokens (audit pass).
- Add `prefers-reduced-motion` guard around heavy framer-motion sections.
- Lazy-load admin route bundles via `React.lazy` + Suspense (AdminDashboard, AdminAuditLog, AdminUssdSessions, DriverDashboard).

## 4. Security final pass
- Re-run `supabase--linter`; fix any remaining warnings.
- Run `security--run_security_scan`; triage findings.
- Confirm M-Pesa callback validates `CheckoutRequestID` belongs to a known pending payment (already does — add idempotency guard so a duplicate callback doesn't double-confirm an order).
- Add rate limit (in-memory token bucket) to `initiate-mpesa-payment` per user (e.g. 5 STK pushes / 10 min) to prevent abuse.
- Update `mem://tech/security/standards` with new rules.

## 5. Error handling & observability
- Global `ErrorBoundary` component wrapping routes with branded fallback + "Report issue" link to /contact.
- Standardize toast error messages (no raw Supabase errors leaking).
- Add `console.error` -> Sentry-free structured log helper `src/lib/log.ts` (no-op in dev, ready for future hookup).

## 6. Tests
- Vitest: `ProductCard.test.tsx` (fallback image, low-stock badge, accessibility).
- Vitest: `SEO.test.tsx` (renders correct tags).
- Playwright: `e2e/checkout-mpesa.spec.ts` — happy path through cart → checkout → STK initiation (mock edge function response).

## 7. Docs
- Update `README.md` with: features list, env/secrets, local dev, test commands, deploy notes, M-Pesa sandbox setup, Resend domain verification recap.

## Files to add
- `src/components/SEO.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/lib/log.ts`
- `scripts/generate-sitemap.ts`
- `public/sitemap.xml` (generated)
- `src/components/products/__tests__/ProductCard.test.tsx`
- `src/components/__tests__/SEO.test.tsx`
- `e2e/checkout-mpesa.spec.ts`

## Files to edit
- `src/App.tsx` (HelmetProvider, ErrorBoundary, lazy admin routes)
- `src/components/products/ProductCard.tsx`
- `src/components/landing/Navbar.tsx`, `Footer.tsx` (a11y labels)
- Page files listed in §2 (SEO component)
- `supabase/functions/initiate-mpesa-payment/index.ts` (rate limit)
- `supabase/functions/mpesa-callback/index.ts` (idempotency guard)
- `public/robots.txt`
- `README.md`
- `package.json` (add `react-helmet-async`)

## Out of scope
- New product features (wishlist/compare/bundles already exist)
- Replacing M-Pesa with another PSP
- Refactoring existing passing tests
