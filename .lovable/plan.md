
## Goal

Three additions to the newsletter admin tooling:

1. Playwright end-to-end tests covering the full subscriber-management flow.
2. Ad-hoc rate limiting on the `send-newsletter-welcome` edge function (per-admin, DB-backed) with a clear "throttled" UI message.
3. A new admin "Audit Log" page that lists newsletter admin actions, supports filters and CSV export, and opens a detail drawer per row.

> Note on rate limiting: the platform doesn't yet have proper rate-limiting infrastructure. The throttle below is an ad-hoc DB count check inside the function — good enough to deter abuse, but not infrastructure-grade.

---

## 1. Playwright E2E tests

### Setup

- Add dev deps: `@playwright/test`.
- New folder `e2e/` with:
  - `playwright.config.ts` — base URL = preview URL (overridable via `E2E_BASE_URL` env), single chromium project, retries=1, trace on first retry.
  - `e2e/fixtures/admin.ts` — fixture that logs in via UI using `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` env vars (falls back to documented test admin), persists `storageState` to `e2e/.auth/admin.json` so subsequent tests reuse the session.
  - `e2e/helpers/seed.ts` — small helper that uses the public anon client to insert ~30 throwaway `newsletter_subscribers` (`e2e+<uuid>@example.test`) before tests and deletes them after via the admin session bulk-delete UI.

### `e2e/newsletter-subscribers.spec.ts`

Covers all four flows working together against the real Admin Dashboard → Subscribers tab:

1. **select-all-matching** — seed 30 rows, filter by `e2e+`, click header checkbox → "select all 30 matching" banner appears → click it → confirm banner reads "All 30 matching subscribers selected".
2. **export & copy** — with all matching selected, click Export CSV; assert a download starts and the file contains 30 email rows + header. Click Copy emails; assert the toast and (where available) `navigator.clipboard.readText()` contains all 30 emails.
3. **bulk delete with confirmation** — click "Delete 30", assert AlertDialog text mentions "remove all 30 matching subscribers", click Cancel → no rows removed; reopen → click Delete → toast success, list refreshes, count drops by 30.
4. **per-row resend spinner** — seed one extra row, intercept `**/functions/v1/send-newsletter-welcome` and delay the response by 1.5s, click Resend → assert button has `aria-busy="true"` and is disabled while in flight, then re-enables after success toast.
5. **rate-limit UX** (added with section 2 below) — intercept the same endpoint and force a 429 with `{ error: { code: "throttled", retry_after: 30 } }`; assert a destructive toast reads "Too many resends. Try again in 30s." and the button re-enables.

### Running

- New scripts in `package.json`: `test:e2e` (`playwright test`), `test:e2e:ui`.
- Playwright install runs via `npx playwright install --with-deps chromium` in CI; tests skip themselves with a clear message if `E2E_BASE_URL` and admin creds aren't set, so local Vitest runs aren't broken.

---

## 2. Rate limit `send-newsletter-welcome`

### Limits

- Per-admin: max **10 resends / 60s** and **100 / hour**.
- Global (across all admins): max **300 / hour** to protect Resend quota — implemented as a guard but configurable via `Deno.env` (`NEWSLETTER_RESEND_PER_MIN`, `NEWSLETTER_RESEND_PER_HOUR`, `NEWSLETTER_RESEND_GLOBAL_HOUR`).

### Mechanism

Use the existing `admin_audit_log` table — already records `action = 'newsletter.resend'` with `created_at` and `admin_id`. Before sending, the function runs (service-role client):

```text
count rows where action='newsletter.resend' AND admin_id=:me AND created_at > now() - interval '1 minute'
count rows where action='newsletter.resend' AND admin_id=:me AND created_at > now() - interval '1 hour'
count rows where action='newsletter.resend' AND created_at > now() - interval '1 hour'
```

If any limit exceeded, return `429` with the existing structured envelope:

```json
{ "error": { "code": "throttled", "message": "...", "retry_after": 42 } }
```

`retry_after` is computed from the oldest qualifying row in the breached window. Successful sends continue to write the audit log, so the counter is self-maintaining (no extra table needed).

### Frontend

`NewsletterSubscribersManager.tsx` resend handler: on `error.code === "throttled"`, show a destructive toast `"Too many resends. Try again in {retry_after}s."` instead of the generic error. Spinner clears as today.

### Tests

- Update `supabase/functions/send-newsletter-welcome/index.test.ts`:
  - Add a documented (skipped-when-offline) test asserting that a `throttled` envelope has `code: "throttled"`, status 429, and includes `retry_after`.
- Vitest update in `NewsletterSubscribersManager.test.tsx`: simulate `invoke` returning `{ error: { code: "throttled", retry_after: 12 } }` and assert the destructive toast message.

---

## 3. Admin Audit Log page

### Route & nav

- New route `/admin/audit-log` (admin-only, same `role !== 'admin'` redirect as `AdminDashboard`).
- Add an "Audit Log" tab/button in `AdminDashboard.tsx` that links here (keeps the dashboard tabs clean — full page gives more room for filters + drawer).

### Component: `src/pages/AdminAuditLog.tsx` + `src/components/admin/AuditLogTable.tsx`

Server-side paginated table backed by `admin_audit_log`. Joins admin display name via the existing `get_leaderboard_profiles` RPC (or a small new `get_admin_profiles` helper if needed) so we don't expose `auth.users`.

**Columns**: When · Admin (name + short id) · Action (badge) · Targets (count, with first email + "+N more") · Metadata preview.

**Filters** (all server-side via Supabase query builder):

- Action: multi-select of allowed actions (`newsletter.resend`, `newsletter.delete`, `newsletter.bulk_delete`).
- Admin: dropdown of distinct admins seen in the table.
- Date range: from / to (`created_at`).
- Email search: `target_emails @> ARRAY[:email]` (uses GIN-friendly contains; falls back to `array_to_string ilike` if needed).

**Pagination**: same pattern as subscribers manager — `range(start, end)` with 25/page, Prev/Next, total via `{ count: 'exact' }`.

**CSV export**: "Export filtered" button — re-runs the current filtered query in chunks of 1000 and streams to a CSV with columns `created_at, admin_id, admin_name, action, target_count, target_emails, metadata`. Same toast pattern as subscribers export.

**Detail drawer**: clicking a row opens a `Sheet` (right-aligned) showing:
- Full timestamp + relative time.
- Admin block (name, id, role).
- Action badge.
- Full `target_emails` array as a scrollable list with copy-all button.
- Pretty-printed `metadata` JSON in a `<pre>` block.
- "Copy JSON" button for the entire row.

### Tests

- Vitest: `AuditLogTable.test.tsx` covering filter → pagination reset, CSV export click invokes chunked queries, drawer opens with row data, action badge variant matches action type.
- Add a Playwright spec `e2e/admin-audit-log.spec.ts` verifying: navigate from dashboard, run an action that writes a log (resend), refresh audit log, see the new row at top, open drawer, export CSV.

---

## Technical Details

### Files to add

- `playwright.config.ts`
- `e2e/fixtures/admin.ts`, `e2e/helpers/seed.ts`
- `e2e/newsletter-subscribers.spec.ts`, `e2e/admin-audit-log.spec.ts`
- `src/pages/AdminAuditLog.tsx`
- `src/components/admin/AuditLogTable.tsx`
- `src/components/admin/AuditLogDetailSheet.tsx`
- `src/components/admin/__tests__/AuditLogTable.test.tsx`

### Files to edit

- `supabase/functions/send-newsletter-welcome/index.ts` — add throttle check before Resend call; return `429 throttled` envelope.
- `supabase/functions/send-newsletter-welcome/index.test.ts` — extend with throttle assertions.
- `src/components/admin/NewsletterSubscribersManager.tsx` — handle `throttled` error code in resend handler with friendly toast.
- `src/components/admin/__tests__/NewsletterSubscribersManager.test.tsx` — add throttled toast test.
- `src/App.tsx` — register `/admin/audit-log` route.
- `src/pages/AdminDashboard.tsx` — add "Audit Log" entry linking to the new page.
- `package.json` — add `@playwright/test`, `test:e2e`, `test:e2e:ui` scripts.

### No DB migration required

The throttle reuses `admin_audit_log` rows already written by the function; the audit-log page reads the existing table. If query performance becomes an issue we can later add `CREATE INDEX ON admin_audit_log (admin_id, action, created_at DESC)` — flagged as a follow-up, not required for this slice.

### Out of scope

- Building infrastructure-grade rate limiting (token bucket, Redis, etc.) — deferred until platform primitives exist.
- Audit-log retention/archival.
- Logging actions outside the newsletter domain (orders, products, users) — easy to add later by passing new `action` values through `log_admin_action`.
