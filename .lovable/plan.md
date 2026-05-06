# Plan: Newsletter Admin Hardening, Audit Log, Tests & UX

## 1. Database — Admin Audit Log

New table `admin_audit_log` to record sensitive admin actions (starting with newsletter resend/delete, extensible later).

Columns:
- `id` uuid pk
- `admin_id` uuid (auth user id)
- `action` text (e.g. `newsletter.resend`, `newsletter.delete`)
- `target_count` int
- `target_emails` text[] (capped to 50; rest summarized in metadata)
- `metadata` jsonb
- `created_at` timestamptz default now()

RLS:
- Only admins can `SELECT`.
- `INSERT` only via security-definer function `log_admin_action(...)` (no direct insert from clients).
- No `UPDATE` / `DELETE` policies (immutable audit trail).

Index on `(admin_id, created_at desc)` and `(action, created_at desc)`.

## 2. Edge function — `send-newsletter-welcome` hardening

Rewrite to:
- Reject missing/malformed `Authorization` header with `401 { error: { code, message } }`.
- Use `supabase.auth.getClaims(token)` (signing-keys pattern) instead of `getUser`.
- Re-check admin via `has_role` RPC; on failure return `403` structured error.
- Validate body with Zod: `{ email: z.string().email().max(255) }`. On fail return `400` with field errors.
- Verify the email exists in `newsletter_subscribers` before sending (prevents arbitrary email blast); return `404` if not.
- Consistent error envelope: `{ error: { code, message, details? } }`.
- After successful send, call `log_admin_action('newsletter.resend', [email], { resend_id })` via service-role client.
- Keep CORS preflight handling.

## 3. Bulk delete logging

Add a second small edge function `log-newsletter-delete` (or reuse a generic `admin-audit-log` function) that the client invokes after a successful bulk/single delete with the affected emails. Function:
- Validates admin via `getClaims` + `has_role`.
- Inserts via `log_admin_action`.

Client calls it from `NewsletterSubscribersManager` immediately after the delete mutation succeeds.

## 4. Frontend — `NewsletterSubscribersManager.tsx`

Enhancements:
- **Resend UX**: per-row pending state keyed by subscriber id. Disable that row's resend button and show a `Loader2` spinner while in-flight. Toast on success ("Welcome email sent to {email}") and error ("Failed to resend to {email}: {message}").
- **Select-all-across-filter**: when the user clicks the header checkbox while there are more results than the current page, show a thin info banner "20 selected. Select all 137 matching subscribers" with a button. Clicking it sets a `selectAllMatching` mode (stores current `{query, from, to}` snapshot) instead of accumulating ids. Bulk export and bulk delete then operate against the filter snapshot:
  - Export: paginate fetches in chunks of 1000 against filter, build CSV.
  - Delete: confirmation dialog shows total count; runs `.delete().match(filter)` style query (re-applying the same filters server-side, not by id list) in chunks if needed.
- Keep existing per-page selection mode as default; switching between modes clears the other.
- Confirmation dialog updated to clearly state "All N subscribers matching current filters" when in matching mode.

## 5. Automated tests

### Frontend (Vitest + Testing Library)
File: `src/components/admin/__tests__/NewsletterSubscribersManager.test.tsx`

Mock `@/integrations/supabase/client` (chainable query builder + `functions.invoke`). Tests:
1. **Pagination** — renders page 1, clicking Next calls query with `range(20,39)`; Prev disabled at page 0.
2. **Filtering** — typing in search debounces/updates query with `ilike`; setting from/to dates adds `gte`/`lte` and resets page to 0.
3. **Bulk delete confirmation** — selecting two rows and clicking "Delete 2" opens AlertDialog; clicking Cancel does NOT call delete; clicking Delete calls `supabase.from(...).delete().in('id', [...])` once with both ids and shows success toast.
4. **Resend loading state** — clicking resend disables that row's button and shows spinner until invoke resolves; success toast fired.
5. **Select-all-matching** — when total > page size, banner appears; clicking it switches mode and bulk delete confirmation announces total count.

### Edge function (Deno test)
File: `supabase/functions/send-newsletter-welcome/index.test.ts`
- Loads env via `dotenv/load.ts`.
- Tests:
  1. `OPTIONS` returns 200 with CORS headers.
  2. Missing `Authorization` → 401 structured error.
  3. Malformed token → 401.
  4. Non-admin user → 403.
  5. Invalid email body → 400 with field errors.
  6. Non-existent subscriber → 404.
  7. (Smoke) admin + valid email reaches Resend call (Resend fetch stubbed via `globalThis.fetch` monkey-patch) → 200 and audit row inserted.

All response bodies consumed; uses test admin credentials from existing test accounts memory.

## 6. Files

| Action | File | Purpose |
|---|---|---|
| Migration | `admin_audit_log` table + `log_admin_action` SECURITY DEFINER fn + RLS | Audit trail |
| Edit | `supabase/functions/send-newsletter-welcome/index.ts` | Hardened auth, Zod, structured errors, audit |
| Create | `supabase/functions/log-admin-action/index.ts` | Client-callable audit logger for deletes |
| Create | `supabase/functions/send-newsletter-welcome/index.test.ts` | Edge function tests |
| Edit | `src/components/admin/NewsletterSubscribersManager.tsx` | Per-row resend spinner, select-all-matching, audit call after delete |
| Create | `src/components/admin/__tests__/NewsletterSubscribersManager.test.tsx` | Frontend tests |

## 7. Implementation order

1. Migration: `admin_audit_log` + `log_admin_action` (await user approval).
2. Harden `send-newsletter-welcome` + create `log-admin-action` edge function.
3. Update `NewsletterSubscribersManager` (resend spinner, select-all-matching, audit invoke after delete).
4. Add Deno tests for the edge function.
5. Add Vitest tests for the manager.
6. Run security scan + linter; address findings.
