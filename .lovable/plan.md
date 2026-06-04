# Plan: Realtime Payments, E2E Coverage & Resend-Safe Email Tools

## 1. Realtime cart/order payment status (`src/pages/Cart.tsx` + new `src/hooks/usePaymentStatus.ts`)
- New hook subscribes to `postgres_changes` on `payments` filtered by `order_id=eq.<id>` and falls back to 4s polling if the channel doesn't connect within 5s.
- Cart's M-Pesa flow consumes the hook; UI states: `idle → stk_sent → pending → completed | failed` with toast + redirect to `/orders/:id` on success, retry CTA on failure.
- Add `payments` to `supabase_realtime` publication via migration (RLS already restricts rows to owner/admin/driver, so subscribers only get their own).
- Same hook reused on `OrderTracking.tsx` so the order page also updates live.

## 2. USSD → cart → M-Pesa E2E (`e2e/ussd-to-mpesa.spec.ts`)
- Uses service-role seeds: registered phone profile, test product.
- POSTs to `ussd-handler` to shop → add to cart → checkout (`6*1`), captures returned order ID prefix.
- POSTs a stubbed success payload to `mpesa-callback` for that order's `CheckoutRequestID` (read from `payments` table via service role).
- Asserts: order row transitions `pending → confirmed`, payment row `pending → completed`, `order_status_history` has the transition, `order_email_log` has `payment_completed`. Re-POSTs the callback to assert idempotency (no duplicate row/email).

## 3. Admin & Driver dashboard E2E (`e2e/admin-dashboard.spec.ts`, `e2e/driver-dashboard.spec.ts`)
- Reuse `e2e/global.setup.ts` to produce `e2e/.auth/admin.json` and add a new `driver.json` storage state (new setup project in `playwright.config.ts`).
- Admin spec: visits `/admin`, asserts tiles (Orders, Users, Audit Log, USSD Sessions, Newsletter) render with data; navbar shows Admin link; logged-out visit redirects to `/auth`; non-admin (default storage state) redirects to `/dashboard`.
- Driver spec: visits `/driver`, asserts assigned orders table renders, status update button visible; non-driver redirected; navbar shows Driver link only for driver session.

## 4. Resend payment-status email button (admin Orders detail)
- New edge function call path: reuse `send-order-status-email` (already idempotent on `(order_id, status)`).
- Add `resend_payment_email` action: small RPC-less endpoint that, when admin clicks "Resend", first deletes the matching `order_email_log` row (admin-only via `has_role`) then re-invokes `send-order-status-email`. Add `log_admin_action` entry for audit.
- UI: button on `src/components/admin/OrdersTable.tsx` row menu — "Resend payment email" with status submenu (`payment_pending | payment_completed | payment_failed`), toast on success/skip.
- Tests:
  - Deno test in `supabase/functions/send-order-status-email/index.test.ts` covering template selection per status and idempotency reply (`{ skipped: true, reason: "already_sent" }`).
  - Vitest for OrdersTable row action calling the function with the right payload.
- Migration: admin-only policy on `order_email_log` for DELETE.

## 5. Responsive 3D UI visual tests (`e2e/visual-3d-ui.spec.ts`)
- Drives `/products` and `/` at 360×800, 768×1024, 1440×900.
- Asserts `.card-3d` and `.btn-3d` are visible, have non-zero box-shadow (via `getComputedStyle`), and that under `prefers-reduced-motion: reduce` (`page.emulateMedia`) transition/animation durations collapse to `0s` (read computed style).
- Adds a Vitest unit in `src/components/products/__tests__/ProductCard.test.tsx` asserting the `card-3d` class is present and the reduced-motion CSS variable token is honored (jsdom + matchMedia stub).

## 6. QA gate
- `bunx vitest run` green.
- `bunx playwright test` against preview URL (existing `playwright.config.ts`).
- `supabase--test_edge_functions` for `send-order-status-email`.
- `supabase--linter` clean after the realtime publication + policy migration.

## Files to add / edit
**New**: `src/hooks/usePaymentStatus.ts`, `e2e/ussd-to-mpesa.spec.ts`, `e2e/admin-dashboard.spec.ts`, `e2e/driver-dashboard.spec.ts`, `e2e/visual-3d-ui.spec.ts`, `e2e/helpers/driverAuth.setup.ts`, migration adding `payments` to realtime + admin DELETE policy on `order_email_log`.
**Edited**: `src/pages/Cart.tsx`, `src/pages/OrderTracking.tsx`, `src/components/admin/OrdersTable.tsx`, `supabase/functions/send-order-status-email/index.ts` (no behavior change beyond test hooks), `supabase/functions/send-order-status-email/index.test.ts`, `playwright.config.ts`, `e2e/helpers/seed.ts` (helpers for payment lookups), `src/components/products/__tests__/ProductCard.test.tsx`.

Approve to implement.
