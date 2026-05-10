## Plan

### 1. E2E test: landing newsletter signup
**File**: `e2e/newsletter-signup-landing.spec.ts`
- Visit `/`, scroll to footer.
- Assert `[data-testid="newsletter-signup-skeleton"]` appears on initial mount, then disappears once hydrated.
- Submit invalid email → expect inline validation error, no insert (poll `newsletter_subscribers` via service-role helper to confirm absent).
- Submit valid `e2e+...@example.test` email → expect success toast and row present in DB. Cleanup row in `afterEach`.
- Add `seedFooterEmail()` cleanup helper in `e2e/helpers/seed.ts`.

### 2. Admin USSD Sessions page
**Route**: `/admin/ussd-sessions` (admin-only via `ProtectedRoute` + role check).

**DB layer** (migration):
- New SECURITY DEFINER RPC `search_ussd_sessions(_q text, _state text, _active bool, _limit int, _offset int)` returning sessions + `total_count`. Internally checks `has_role(auth.uid(),'admin')` and queries `ussd_sessions` filtered by `phone_number ILIKE` / `session_id ILIKE`, optional `menu_state`, `is_active`. Order by `created_at DESC`. Cap limit 200.
- `REVOKE ALL ... FROM PUBLIC, anon`; `GRANT EXECUTE ... TO authenticated`.
- New RPC `get_ussd_session_detail(_session_id text)` returning the row + parsed `session_data` JSON (history of state transitions stored under `session_data->'transitions'`). Admin-only.
- Optional: extend `ussd-handler` to append `{ from, to, at }` entries to `session_data.transitions` on each state change (small, additive).

**UI**:
- `src/pages/AdminUssdSessions.tsx` — page wrapper with Navbar/Footer, role guard mirroring `AdminAuditLog`.
- `src/components/admin/UssdSessionsTable.tsx` — search input (debounced), state `Select` (MAIN/SHOP/CART/CHECKOUT/etc.), active toggle, pagination (25/page), row click opens detail sheet.
- `src/components/admin/UssdSessionDetailSheet.tsx` — shows session metadata + a vertical timeline of `transitions` (state, timestamp, payload).
- Wire route in `src/App.tsx` and add link button on `AdminDashboard.tsx` next to the Audit Log button.
- Add loading skeleton component matching the table shape.

### 3. E2E test: admin audit log CSV export + rate limiting
**File**: `e2e/admin-audit-log-export.spec.ts` (extends existing).
- Logged-in admin (uses existing `storageState`).
- Apply filter (action=`newsletter.resend`, mode=Substring with `e2e+`), click Export, await download, parse CSV header + count rows, assert ≥0 rows and `X-Export-Count` header reachable via network capture.
- Multi-exact mode: enter 2 known seeded emails, export, assert returned rows only contain those emails.
- Rate-limit test: hit Export rapidly 6 times in a loop within 60s; 6th invocation should produce a destructive toast containing "Too many exports" / retry hint. Assert toast text via `getByText(/too many exports/i)`.
- Use `request` fixture for the burst (calls edge function directly with admin bearer extracted from storageState) to avoid relying on click rate.

### 4. HIBP verification + linter rerun
- Call `supabase--configure_auth` with `password_hibp_enabled: true` (idempotent — confirms state).
- Run `supabase--linter`, capture warnings, and report any remaining ones to the user. If `auth_leaked_password_protection` warning persists, surface remediation.

### Files

**New**
- `e2e/newsletter-signup-landing.spec.ts`
- `e2e/admin-audit-log-export.spec.ts`
- `src/pages/AdminUssdSessions.tsx`
- `src/components/admin/UssdSessionsTable.tsx`
- `src/components/admin/UssdSessionDetailSheet.tsx`
- `src/components/admin/skeletons/UssdSessionsSkeleton.tsx`
- `supabase/migrations/<ts>_ussd_admin_rpcs.sql`

**Edited**
- `src/App.tsx` (route)
- `src/pages/AdminDashboard.tsx` (link button)
- `e2e/helpers/seed.ts` (newsletter cleanup helper, audit-log seed helper)
- `supabase/functions/ussd-handler/index.ts` (append transitions, additive)

### Out of scope
No business-logic changes to existing audit log filtering or USSD flow beyond appending transitions.
