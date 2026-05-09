# Plan: Security hardening + test coverage + newsletter skeletons

Four focused workstreams. Each is independently shippable; I'll do them in one pass.

---

## 1. Supabase security linter cleanup

**Goal:** clear remaining warnings around storage bucket exposure and over-permissive `SECURITY DEFINER` functions.

Steps:
- Run `supabase--linter` first to confirm current warnings (so we fix what's actually flagged, not guesswork).
- For each public storage bucket (`product-images`, `review-images`, `content-images`):
  - Keep `public = true` only where genuinely needed; otherwise flip to `false` and add a public-read RLS policy scoped to that bucket so listing the bucket root is not possible.
  - Add explicit `storage.objects` policies: `SELECT` allowed for `bucket_id = '<x>'`; `INSERT/UPDATE/DELETE` restricted to admins (or owners by `(storage.foldername(name))[1] = auth.uid()::text` where applicable).
  - Revoke any blanket `anon` listing on `storage.objects` that's not needed.
- For `SECURITY DEFINER` functions, tighten `EXECUTE`:
  - `apply_coupon`, `search_audit_log`, `get_audit_admin_names`, `get_leaderboard_profiles`, `log_admin_action`, `has_role`:
    - `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon;`
    - `GRANT EXECUTE ... TO authenticated;` (admin-only ones rely on internal `has_role` check; that's already in place).
  - Confirm every definer function has `SET search_path = public` (already true per current schema).
- Re-run linter at the end and report remaining items.

Delivered as one migration: `supabase/migrations/<ts>_security_hardening_storage_and_definers.sql`.

---

## 2. Playwright E2E for USSD state machine

**Goal:** end-to-end coverage of the USSD flow against the deployed `ussd-handler` edge function (Africa's Talking POSTs `application/x-www-form-urlencoded`).

New file: `e2e/ussd-flow.spec.ts`. Uses `request` fixture (no browser) to POST directly to the function URL with seeded data.

Coverage:
- Main menu rendering (`text=""` → `CON Welcome…`).
- Shop list → product detail → quantity → add-to-cart (`1*1*1*2`) and assert session row in DB has expected `cart`.
- View cart (`6`) shows subtotal; checkout (`6*1`) creates `orders` + `order_items` rows, triggers a `payments` row via `initiate-mpesa-payment`, returns `END Order … placed!`.
- Buy-now path (`1*1*2*3`) for a registered phone.
- Track order with valid 8-char prefix and too-short ID.
- Eco-points for unregistered vs registered phone.
- Tips (`4`) and Support (`5`) end with correct copy + `+254 700 116 655`.
- M-Pesa confirmation: simulate the `mpesa-callback` POST and assert the order/payment status flips to `confirmed`/`success` (read via Supabase service role through a small helper in `e2e/helpers/seed.ts`).

Seed helper additions:
- `seedUssdProduct()`, `seedUserWithPhone(msisdn)`, `clearUssdSession(sessionId)`, `getOrderByPrefix(prefix)`, `simulateMpesaCallback(checkoutRequestId, success)`.

Config:
- Reuse existing `playwright.config.ts`. Add a `ussd` project (no browser) only if needed; otherwise default project is fine since we only use `request`.

---

## 3. AuditLogTable unit tests

New file: `src/components/admin/__tests__/AuditLogTable.test.tsx` (vitest + Testing Library, mirroring the existing `NewsletterSubscribersManager.test.tsx` pattern). Mocks `@/integrations/supabase/client` to control `rpc('search_audit_log', …)` and `functions.invoke('export-admin-audit-log')`.

Cases:
- **Contains mode (default):** types `alice` → calls `rpc` with `{ _email_query: 'alice', _mode: 'contains', _emails: null }`; renders rows.
- **Mode toggle to multi-exact:** entering `a@x.com, b@y.com` produces two pills; rpc called with `_emails: ['a@x.com','b@y.com']`, `_mode: 'multi-exact'`, `_email_query: null`.
- **Invalid email pill:** typing `not-an-email` shows inline error "Invalid email" and pill is not added; rpc is not re-fired.
- **Empty multi-exact:** removing all pills → rpc called with `_emails: null`, falls back to unfiltered search.
- **Pagination:** with `total_count > pageSize`, Next button enabled; clicking advances `_offset`; Prev disabled on first page; both disabled when `total_count <= pageSize`.
- **Row click → detail sheet open** (assert sheet content `metadata` JSON renders).
- **CSV export error toast** when `functions.invoke` returns 429 → assert "Rate limited" toast.

---

## 4. Newsletter skeletons + secured wiring

**Goal:** consistent loading UX in the newsletter admin surface and a public-facing skeleton during fetches.

New file: `src/components/admin/skeletons/NewsletterSubscribersSkeleton.tsx` — table-shaped skeleton (header row + 8 placeholder rows with checkbox/email/date/actions cells) using existing `Skeleton` primitive and design tokens.

New file: `src/components/landing/NewsletterSignupSkeleton.tsx` — small inline skeleton for the footer/CTA newsletter form during hydration.

Wiring:
- `NewsletterSubscribersManager.tsx`: replace the current `<Loader2 />` (or naive null) loading branch with `<NewsletterSubscribersSkeleton />`. Keep all existing admin guards (`role !== 'admin'` redirect; queries already RLS-gated).
- Footer/landing newsletter signup: render the lightweight skeleton until the component mounts (suspense or `useEffect` mount flag) — purely presentational, no data exposure.
- Security checks confirmed unchanged: list/delete still admin-only via existing RLS; subscribe-from-public still allowed via `Anyone can subscribe` policy.

Tests:
- Extend `NewsletterSubscribersManager.test.tsx` with one case: while loading, the skeleton (testid `newsletter-subscribers-skeleton`) renders and the table is absent.

---

## Files touched

```text
New
  supabase/migrations/<ts>_security_hardening_storage_and_definers.sql
  e2e/ussd-flow.spec.ts
  src/components/admin/__tests__/AuditLogTable.test.tsx
  src/components/admin/skeletons/NewsletterSubscribersSkeleton.tsx
  src/components/landing/NewsletterSignupSkeleton.tsx

Edited
  e2e/helpers/seed.ts                               (USSD + mpesa helpers)
  src/components/admin/NewsletterSubscribersManager.tsx   (skeleton wiring)
  src/components/landing/Footer.tsx (or wherever signup lives)  (skeleton wiring)
  src/components/admin/__tests__/NewsletterSubscribersManager.test.tsx
  mem://tech/security/standards                     (note storage + EXECUTE hardening)
```

## Out of scope

- No UI redesign of audit log or newsletter pages beyond skeletons.
- No new edge functions; USSD/export functions already exist.
- No migration to private buckets if linter doesn't flag them — only act on actual warnings.

Approve and I'll implement in one pass, then run the linter + vitest + a `ussd-flow` dry run to verify.
