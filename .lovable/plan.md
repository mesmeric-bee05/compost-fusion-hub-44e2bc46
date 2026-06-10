# Plan: Payment Realtime UX + Email Resend Hardening + Audit Trail

## 1. Real-time payment status toasts

- Extend `src/hooks/usePaymentStatus.ts` to expose `{ snapshot, previousStatus, transport: "realtime" | "polling" | "connecting" | "disconnected" }`.
- New hook `useOrderPaymentToasts(orderId)` watches snapshot transitions and emits sonner toasts only on change:
  - `pending → completed`: success toast "Payment completed — order confirmed".
  - `pending → failed`: error toast with `result_description`, action button "Retry payment" linking to `/cart`.
  - First `pending` observation: info toast "Awaiting M-Pesa confirmation…".
- Wire the hook into `src/pages/Cart.tsx` and `src/pages/OrderTracking.tsx` so toasts fire wherever the user is, without duplicating logic.
- Unit test the transition logic in `src/hooks/__tests__/useOrderPaymentToasts.test.tsx` using `vi.mock("sonner")`.

## 2. Resend rate limiting for payment-status emails

- New table `payment_email_resend_attempts(order_id, status, admin_id, attempted_at)` + index, with RLS allowing admin SELECT/INSERT and service_role full access.
- New `public.check_email_resend_rate(_order uuid, _status text)` security-definer function returning `{ allowed, retry_after_seconds, attempts_in_window }`. Rule: max **3 resends per (order,status) per 60 minutes**, and a 30-second cooldown between attempts.
- Edge function `resend-payment-status-email` (new): validates admin via JWT + `has_role`, calls the rate-limit RPC, on `allowed=false` returns `429` with `{ retry_after_seconds }`; on allowed: deletes the `order_email_log` row, invokes `send-order-status-email`, logs an attempt + writes to `admin_audit_log` via `log_admin_action` ("payment_email.resend").
- Update `src/components/admin/OrdersTable.tsx` resend mutation to call this new function (instead of doing the delete client-side) and surface a specific toast on 429 ("Rate limit reached — try again in Xs"), plus inline disabled state on the menu item while cooldown is active.
- E2E `e2e/payment-email-resend-rate-limit.spec.ts`: as admin, trigger 4 resends in a row for one order/status, assert the 4th surfaces the rate-limit UI message and the audit-log records exactly 3 successful entries.
- Deno test for the new edge function covering: missing auth → 401, non-admin → 403, cooldown hit → 429, success path → 200.

## 3. Realtime disconnected fallback indicator

- `usePaymentStatus` already polls on `CHANNEL_ERROR | TIMED_OUT`; expand to also flip `transport` to `"polling"` and re-attempt subscribe every 30s. When subscribed, flip back to `"realtime"`.
- New `<PaymentStatusBadge transport=… />` shown on Cart pending state and OrderTracking header:
  - `realtime`: subtle green dot + "Live updates".
  - `polling`: amber dot + "Live updates unavailable — checking every 4s".
  - `disconnected`: red dot + retry button that calls a `reconnect()` returned by the hook.
- Unit tests for the hook simulating subscribe success, `CHANNEL_ERROR`, and timer-driven polling using `vi.useFakeTimers()` and a mocked `supabase.channel`.
- Playwright `e2e/realtime-fallback.spec.ts`: monkey-patch `window.WebSocket` before navigation to force connection failure; assert the amber polling badge appears and that a payment row update is still reflected (via direct DB insert through service role helper) within ~5s.

## 4. Admin audit trail for email resends

- Reuse `admin_audit_log`. The new edge function writes one entry per attempt with action `payment_email.resend` and metadata `{ order_id, status, template, resend_id, result: "sent" | "rate_limited" | "failed", error? }`.
- Extend `src/components/admin/AuditLogTable.tsx` filter dropdown to include `payment_email.resend`.
- New panel `src/components/admin/PaymentEmailResendHistory.tsx` rendered on the order detail drawer (and as a tab on `/admin/audit-log` filtered view): table with columns Admin, When, Template/Status, Result, Resend ID; fetched via `search_audit_log` RPC filtered by action and metadata `order_id`.
- Backfill: small migration adds an index on `admin_audit_log((metadata->>'order_id'))` for fast per-order lookup.
- E2E `e2e/admin-payment-email-audit.spec.ts`: trigger a resend as admin, navigate to `/admin/audit-log`, filter by `payment_email.resend`, assert the new row shows admin email, template (`payment_completed`), and result `sent`; open the detail sheet and assert metadata JSON contains `order_id` and `resend_id`.

## 5. Continued hardening pass

- `supabase--linter` after migrations; resolve any new findings on the two new tables/indexes.
- Add `<SEO>` to any pages missing it surfaced during this pass (spot-check `AdminAuditLog`, `DriverDashboard`, `OrderTracking`).
- Ensure all new toasts respect `prefers-reduced-motion` (sonner default is fine; just verify no custom animation classes regress).
- Vitest + Playwright must be green before closing.

## Files

**New**: `src/hooks/useOrderPaymentToasts.ts`, `src/hooks/__tests__/useOrderPaymentToasts.test.tsx`, `src/hooks/__tests__/usePaymentStatus.test.tsx`, `src/components/payments/PaymentStatusBadge.tsx`, `src/components/admin/PaymentEmailResendHistory.tsx`, `supabase/functions/resend-payment-status-email/index.ts` + `index.test.ts`, `e2e/payment-email-resend-rate-limit.spec.ts`, `e2e/realtime-fallback.spec.ts`, `e2e/admin-payment-email-audit.spec.ts`, migration for `payment_email_resend_attempts` + `check_email_resend_rate` + audit index.

**Edited**: `src/hooks/usePaymentStatus.ts`, `src/pages/Cart.tsx`, `src/pages/OrderTracking.tsx`, `src/components/admin/OrdersTable.tsx`, `src/components/admin/AuditLogTable.tsx`, `src/pages/AdminAuditLog.tsx`.
