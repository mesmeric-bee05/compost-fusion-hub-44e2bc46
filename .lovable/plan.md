
## Goal
Finish the M-Pesa purchase loop end-to-end (UI → STK → callback → emails), lock down payments security, finalize admin/driver dashboards with auth tests, and apply a cohesive responsive "3D" visual polish across the app.

## 1. M-Pesa Cart Checkout Integration
- `src/pages/Cart.tsx`: add a "Pay with M-Pesa" flow:
  - Phone input (pre-filled from profile, Kenyan validation `+254/0…`), KES total summary, optional coupon.
  - Create order (`orders` + `order_items`) in a single supabase call, then invoke `initiate-mpesa-payment`.
  - Show staged UI: `idle → creating order → STK sent (check phone) → polling → success/failure`.
  - Realtime via `supabase.channel('payments:order_id=eq.<id>')` subscribed to UPDATE → reflect `pending/completed/failed`.
  - Fallback polling every 4s for 90s if realtime drops.
  - Toast + redirect to `/orders/:id` on success; inline retry on failure (with rate-limit 429 toast wording).
- New hook `src/hooks/useMpesaPayment.ts` to encapsulate invoke + subscription + cleanup.

## 2. Payments / RLS Hardening (migration)
Audit current policies (already mostly correct) and tighten:
- `payments`: drop write access for users on UPDATE (currently no user UPDATE policy — confirm); ensure INSERT WITH CHECK enforces `auth.uid() = user_id AND order belongs to user` via a SECURITY DEFINER helper `user_owns_order(uuid)`.
- Restrict `payments` SELECT to owner OR admin OR assigned driver of the order.
- `order_status_history`: ensure no public INSERT/UPDATE — only the SECURITY DEFINER trigger writes.
- Re-affirm triggers exist: `record_order_initial_status`, `record_order_status_change`, `notify_order_status_change`, `decrement_stock_on_confirm`, `notify_reward_change`. Add `CREATE TRIGGER` statements if missing (the function bodies exist but no triggers are reported).
- Re-run `supabase--linter` after migration.

## 3. Order Status Email Notifications
- Extend `send-order-status-email` edge function to handle three states: `pending_payment`, `payment_completed`, `payment_failed` (plus existing `confirmed/shipped/delivered/cancelled`).
- Resend-safe: idempotency key = `${order_id}:${status}`; check `email_send_log` or a lightweight `order_email_log` table to avoid duplicates.
- Wire from `mpesa-callback`: send `payment_completed` on success, `payment_failed` on failure; from cart on STK initiation: `pending_payment`.
- Deno tests in `supabase/functions/send-order-status-email/index.test.ts` covering the three branches + idempotency short-circuit.

## 4. Playwright E2E
- `e2e/mpesa-checkout.spec.ts`:
  - Seed product + login as test user, add to cart, submit checkout.
  - Stub `initiate-mpesa-payment` (route intercept) to return a known `CheckoutRequestID`.
  - Directly POST to the deployed `mpesa-callback` with success payload → assert UI flips to "Payment received", order row status = `confirmed`, navigates to `/orders/:id`.
  - Repeat with failure payload → assert "Payment failed" UI + retry button.
  - Replay the same success callback twice → assert order stays `confirmed`, only one payment row updated (idempotency).

## 5. Admin & Driver Dashboards Finalization
- `AdminDashboard.tsx`: ensure tiles for Orders, Products, Coupons, Bundles, Content, Newsletter, Audit Log, USSD Sessions, Contact Submissions, Users; guard via `useAuth().role === 'admin'`, redirect non-admins to `/`.
- `DriverDashboard.tsx`: list assigned orders + collections, status update buttons (uses existing RLS), proof-of-delivery photo upload.
- New `<RoleRoute role="admin|driver">` wrapper component (replaces inline checks) used in `App.tsx`.
- `Navbar.tsx`: conditional links — Admin link if admin, Driver link if driver, both hidden otherwise.
- Vitest UI tests:
  - `RoleRoute.test.tsx` — redirects when role mismatched.
  - `Navbar.test.tsx` — admin link only renders for admin role (mock `useAuth`).
  - `AdminDashboard.test.tsx` — renders tiles for admin, null/redirect for individual.

## 6. Responsive "3D" UI Polish (design tokens only)
Strictly token-driven (no hardcoded colors):
- Extend `index.css` with `--shadow-3d`, `--shadow-3d-hover`, `--gradient-surface`, `--gradient-primary-3d` (HSL only).
- Add Tailwind utilities: `.card-3d` (layered shadow + subtle gradient + 1px inner highlight), `.btn-3d` (translateY hover, pressed state).
- Apply to: `ProductCard`, dashboard tiles, hero CTA, cart summary, M-Pesa status card.
- Verify responsiveness at 360/768/1024/1440; ensure no horizontal scroll on the current 945px viewport.
- Honor `prefers-reduced-motion` to disable transforms.

## 7. USSD Sanity Pass
- Smoke-test `ussd-handler` flow (browse → add to cart → checkout → M-Pesa) via `supabase--curl_edge_functions` simulating Africa's Talking payloads; fix any state regressions surfaced.

## 8. QA Gate (before sign-off)
- `bunx vitest run` green
- `supabase--linter` clean (or only documented SECURITY DEFINER warnings)
- `supabase--test_edge_functions` for `send-order-status-email`, `mpesa-callback`-adjacent tests
- Playwright suite green locally (skip live Safaricom call via intercepts)

## Files (new / edited)
**New**: `src/hooks/useMpesaPayment.ts`, `src/components/cart/MpesaCheckout.tsx`, `src/components/auth/RoleRoute.tsx`, `e2e/mpesa-checkout.spec.ts`, `src/components/__tests__/RoleRoute.test.tsx`, `src/components/landing/__tests__/Navbar.test.tsx`, `src/pages/__tests__/AdminDashboard.test.tsx`, `supabase/migrations/<ts>_payments_rls_hardening.sql`, `supabase/functions/send-order-status-email/index.test.ts` (extend).
**Edited**: `src/pages/Cart.tsx`, `src/App.tsx`, `src/components/landing/Navbar.tsx`, `src/pages/AdminDashboard.tsx`, `src/pages/DriverDashboard.tsx`, `src/components/products/ProductCard.tsx`, `src/index.css`, `tailwind.config.ts`, `supabase/functions/send-order-status-email/index.ts`, `supabase/functions/mpesa-callback/index.ts`.

## Out of scope (call out)
- Going live on Safaricom production (still sandbox creds).
- Marketing email broadcasts.
- Native push notifications.
