# Security, Realtime, USSD/M-Pesa hardening + checkout fix

## 1. Re-run scan results (current findings)

Connector scan (Wiz / connector_security_scan): **0 items**. Supabase scans returned **14 items**:

| # | Severity | Source | Issue | Location |
|---|----------|--------|-------|----------|
| 1 | error | supabase_lov | `payments.callback_token` readable by owner via "Users can view own payments" RLS — owner could forge a callback | `public.payments`, mpesa-callback |
| 2 | warn | supabase_lov | No RLS on `realtime.messages` — any authenticated user can subscribe to another user's order/payment/notification topic | `realtime.messages` |
| 3 | warn | supabase_lov | `ussd_sessions` writer surface — verify only service role writes | `public.ussd_sessions` |
| 4–14 | warn | supabase | 11× "Signed-in users can EXECUTE SECURITY DEFINER function" | `public.*` RPCs |

## 2. Fixes (mapped 1:1)

### A. Migration: hide `callback_token`, tighten Realtime, lock SECURITY DEFINER execute
- Drop "Users can view own payments" policy. Replace with a column-restricted policy via a **`public.payments_safe` view** (excludes `callback_token`, `mpesa_merchant_request_id`) and grant SELECT on the view to `authenticated`. Update `src/hooks/usePaymentStatus.ts` + admin reads to use the view.
- `REVOKE EXECUTE ... FROM authenticated` on RPCs that must never be user-callable: `log_admin_action`, `increment_coupon_usage` (trigger-only), `record_order_status_change`, `record_order_initial_status`, `notify_*` (all triggers), `create_notification_preferences`, `handle_new_user`, `decrement_stock_on_confirm`, `update_updated_at_column`, `get_audit_admin_names` (admin-only via RPC wrapper kept), `check_email_resend_rate` (called by edge function via service role only).
- Keep `EXECUTE` for: `apply_coupon`, `create_order`, `get_public_profiles`, `get_leaderboard_profiles`, `has_role`, `search_audit_log`, `search_ussd_sessions`, `get_ussd_session_detail` (already admin-gated internally).
- Add a trigger on `ussd_sessions` that blocks INSERT/UPDATE from non-service roles (defence in depth).

### B. Migration: RLS on `realtime.messages`
```sql
alter table realtime.messages enable row level security;

-- Allow a user to subscribe ONLY to topics scoped to their own uuid.
create policy "users subscribe to own topics"
  on realtime.messages for select to authenticated
  using (
    -- topic patterns we publish: payment-<orderId>-*, order-<orderId>, notifications-<userId>
    -- match any topic whose suffix maps to a row owned by auth.uid()
    exists (
      select 1 from public.orders o
      where realtime.topic() like 'payment-' || o.id::text || '%'
         or realtime.topic() = 'order-' || o.id::text
      and o.user_id = auth.uid()
    )
    or realtime.topic() = 'notifications-' || auth.uid()::text
    or public.has_role(auth.uid(), 'admin')
  );
```
Rename current channel names in `usePaymentStatus.ts`, `OrderTracking.tsx`, `useNotifications.ts` to match these stable topic patterns. Add **pgTAP-style SQL tests** in a new `supabase/tests/realtime_rls.test.sql` plus a Vitest integration test using two auth clients (user A cannot subscribe to user B's order channel).

### C. AT_CALLBACK_SECRET configuration
- Trigger the `add_secret` flow for `AT_CALLBACK_SECRET` (random 48-char value provided by user).
- Update `ussd-handler` to **require** the secret (remove soft-allow path) and accept it via header `X-AT-Secret` OR query `?secret=…`.
- Document in `README.md` and a new `docs/africastalking-setup.md`: in AT dashboard → USSD → Callback URL, append `?secret=<value>` (AT does not allow custom headers on USSD callbacks, so query param is the supported path) and the function enforces constant-time comparison.
- Add Deno test `ussd-handler/auth.test.ts` covering: missing secret → 401, wrong length → 401, correct secret → 200.

### D. CI gate for security scans
- Add `.github/workflows/security-scan.yml`:
  - Runs on PR + main.
  - Calls Wiz CLI (`wiz-cli iac scan --policy default --tag repo=$REPO`) and uploads SARIF.
  - Calls a new script `scripts/run-supabase-scan.mjs` that hits the Lovable scan endpoint via `LOVABLE_API_KEY` secret and emits JSON.
  - `scripts/compare-findings.mjs` diffs against `security/baseline.json`; fails the job when `new_errors > 0` or `new_warnings > THRESHOLD` (default 2, configurable via repo var `SEC_WARN_THRESHOLD`).
  - Job summary includes deep links to Wiz dashboard and the uploaded artifact.
- Commit initial `security/baseline.json` from current scan (0 errors after fixes; warnings tracked).

### E. Consolidated report
- Generate `/mnt/documents/security-report-v1.pdf` (via Python+reportlab) listing every finding, severity, fix, migration filename, and verification step. Surface with `<presentation-artifact>`.

## 3. Checkout fix — "M-Pesa Edge Function returned non-2xx"

Edge logs show `initiate-mpesa-payment error: Invalid Access Token`. Root cause: function hardcodes `https://api.safaricom.co.ke` (production) but credentials in the project are sandbox keys.

- Add `MPESA_ENV` secret (`sandbox` | `production`, default `sandbox`).
- Switch base URL: `sandbox.safaricom.co.ke` vs `api.safaricom.co.ke`.
- Surface a clearer error to the UI when M-Pesa returns 401 ("M-Pesa credentials rejected — verify environment & shortcode").
- Add `e2e/checkout-mpesa-sandbox.spec.ts` that mocks STK push and verifies happy path + receipt callback.

## 4. USSD end-to-end verification
- Patch `createOrderAndPay` to call `create_order` RPC (server-authoritative pricing) instead of raw insert — closes a price-manipulation gap and matches web checkout.
- Re-run `e2e/ussd-to-mpesa.spec.ts`.

## 5. Files touched

**New:** migration `2026XXXX_security_hardening.sql`, `supabase/tests/realtime_rls.test.sql`, `supabase/functions/ussd-handler/auth.test.ts`, `.github/workflows/security-scan.yml`, `scripts/run-supabase-scan.mjs`, `scripts/compare-findings.mjs`, `security/baseline.json`, `docs/africastalking-setup.md`, `e2e/checkout-mpesa-sandbox.spec.ts`, `e2e/realtime-topic-isolation.spec.ts`.

**Edited:** `supabase/functions/initiate-mpesa-payment/index.ts`, `supabase/functions/ussd-handler/index.ts`, `supabase/functions/mpesa-callback/index.ts`, `src/hooks/usePaymentStatus.ts`, `src/hooks/useNotifications.ts`, `src/pages/OrderTracking.tsx`, `src/pages/Cart.tsx` (error mapping), `README.md`.

**Secrets:** request `AT_CALLBACK_SECRET`, `MPESA_ENV`.

## 6. Verification checklist
- `supabase--linter` → 0 errors.
- `security--run_security_scan` → 0 errors, only intentional warns with `update_memory` entries.
- Playwright: checkout, USSD, realtime fallback, topic isolation green.
- Manual: place test order in sandbox → STK push delivered → callback updates `payments.status=completed` → toast + redirect.

Approve to implement.
