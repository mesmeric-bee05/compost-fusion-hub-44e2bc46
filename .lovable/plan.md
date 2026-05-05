# Plan: Newsletter Subscribers Manager + Verification + Hardening

## 1. Newsletter Subscribers Admin Manager

Create `src/components/admin/NewsletterSubscribersManager.tsx`:
- Lists all rows from `newsletter_subscribers` (admin-only via existing RLS)
- Search/filter by email
- Subscriber count + subscribed date
- **Export to CSV** button — generates a client-side CSV download (`email,subscribed_at`)
- **Copy all emails** button (comma-separated, for pasting into mailing tools)
- Delete subscriber (RLS already allows admin DELETE)
- Pattern follows `ContactSubmissionsManager.tsx`

Update `src/pages/AdminDashboard.tsx`:
- Add `{ id: "subscribers", label: "Subscribers", icon: Mail }` tab
- Render `<NewsletterSubscribersManager />`

## 2. Verification Pass (read-only checks)

Use the browser tool to:
- Visit `/admin` → Products tab: open create dialog, fill fields, upload an image, submit, confirm row appears in table.
- Visit `/admin` → Contacts tab: confirm submissions render with Read/Unread badges and detail dialog marks-as-read.
- Visit `/admin` → Subscribers tab (new): confirm list, CSV export, delete.

Fix any runtime issues found during verification.

## 3. USSD Feature Audit

Review `supabase/functions/ussd-handler/index.ts` and `src/pages/Ussd.tsx`:
- Confirm CORS, session persistence in `ussd_sessions`, M-Pesa STK trigger path.
- Add zod input validation for `sessionId`, `phoneNumber`, `text` form fields.
- Phone-number normalization helper (handle `+254`, `254`, `0…` consistently for the eco-points lookup).
- Defensive null-checks on `session.session_data` cast (currently `as any`) — replace with typed parse.
- Add a simple `/ussd` simulator panel improvement note only if `Ussd.tsx` lacks one (read first, then decide).

## 4. Security Hardening

- Run `supabase--linter` and address any new warnings.
- Run `security--run_security_scan` and triage findings (fix or document via memory).
- Verify `password_hibp_enabled` is on (configure_auth if not).
- Audit RLS for any newly-touched tables (none expected — no schema changes).
- Confirm no client code references service-role keys.

## 5. Error Sweep

- `rg "console.error|TODO|FIXME"` across `src/` and `supabase/functions/` to surface latent issues.
- Read `src/pages/Ussd.tsx`, `ProductsManager.tsx`, `ContactSubmissionsManager.tsx` for type safety; replace `as any` casts with typed shapes where trivial.

## Files Summary

| Action | File |
|---|---|
| Create | `src/components/admin/NewsletterSubscribersManager.tsx` |
| Edit | `src/pages/AdminDashboard.tsx` (add Subscribers tab) |
| Edit | `supabase/functions/ussd-handler/index.ts` (zod validation, typed session_data, phone normalization) |
| Edit | `src/pages/Ussd.tsx` (only if issues found during read) |

No DB schema changes — all required tables and RLS already exist.

## Implementation Order
1. Create NewsletterSubscribersManager + wire tab
2. Harden ussd-handler (validation + types)
3. Run linter + security scan; fix findings
4. Browser-verify Products, Contacts, Subscribers flows; patch any bugs found