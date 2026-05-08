# Deep upgrade: Audit Log, Security, USSD, UX & Imagery

## 1. Audit Log email filter — partial + multi-email

**UI (`AuditLogTable.tsx`)**
- Replace single email input with a small composite control: a Tabs/Toggle ("Contains" | "Multi-exact") and an input.
- Multi-exact mode parses comma/space separated emails into pill chips (with remove-x); validates each with zod, shows inline feedback ("3 emails • 1 invalid").
- Contains mode performs case-insensitive partial matching on any email in `target_emails`.
- Debounced (300 ms) query updates; result-count chip ("Matches X of Y").

**Query layer**
- Add Postgres RPC `search_audit_log(_action text, _from timestamptz, _to timestamptz, _email_query text, _emails text[], _mode text, _limit int, _offset int)` returning rows + total count.
  - Contains: `EXISTS (SELECT 1 FROM unnest(target_emails) e WHERE e ILIKE '%' || _email_query || '%')`.
  - Multi-exact: `target_emails && _emails`.
  - Internally calls `has_role(auth.uid(),'admin')` and raises `not_admin` otherwise.
- Frontend swaps the direct `from('admin_audit_log')` call for `supabase.rpc('search_audit_log', …)`.

**Tests** (`AuditLogTable.test.tsx`)
- Switching modes updates query shape.
- Invalid email pills are flagged.
- Empty result renders "No matches" with reset CTA.

## 2. RLS & RPC hardening

**`admin_audit_log`**
- Keep `SELECT` admin-only; add explicit `INSERT/UPDATE/DELETE` policies that always evaluate `false` (defense in depth — only the SECURITY DEFINER `log_admin_action` writes).
- Add `REVOKE ALL ON public.admin_audit_log FROM anon, authenticated` (only via RPCs/policies).

**`get_leaderboard_profiles`**
- Currently `SECURITY DEFINER` returning all queried profiles. Tighten:
  - `REVOKE EXECUTE … FROM anon`; `GRANT EXECUTE … TO authenticated`.
  - Cap input array length (≤ 200) and return only `user_id, full_name` (already does).
  - Add `SET search_path = public` (already set — verified).
- Add a sibling `get_audit_admin_names(user_ids uuid[])` restricted to admins for the audit page so leaderboard RPC stays narrow.

**Linter pass** after migration; fix any new warnings.

## 3. Server-side CSV export with strict auth + rate limit

New edge function `export-admin-audit-log`:
- Validates `Authorization` header → derives caller's user via `auth.getUser(jwt)`.
- Verifies `has_role(caller,'admin')`; otherwise 401/403 with structured `{ error: { code, message } }`.
- Re-runs the same filter logic server-side using the service role key (does **not** trust client-supplied count or rows).
- DB-backed throttle on `admin_audit_log`: 5 exports / 60 s and 30 / hour per admin; 100 / hour global, action `audit.export`. Returns 429 with `Retry-After`.
- Streams CSV (`text/csv`) with proper escaping; writes one `audit.export` log row including filter JSON in metadata.

Frontend:
- `AuditLogTable.exportCsv` calls `supabase.functions.invoke('export-admin-audit-log', { body: filters })`, downloads the returned blob.
- Surfaces throttled/forbidden errors via toast.

Tests: `supabase/functions/export-admin-audit-log/index.test.ts` covers: missing auth → 401, non-admin → 403, throttled → 429, success → CSV with header row.

## 4. Playwright E2E — Admin Audit Log

`e2e/admin-audit-log.spec.ts` (replace existing minimal spec):
- Login via existing fixture, seed 3 audit rows by triggering newsletter resend + delete via UI.
- Filter by action, by partial email, by multi-exact (toggle modes); assert result counts.
- Click row → detail sheet visible with metadata JSON & target emails; close on Escape.
- Click "Export filtered CSV" → assert `download` event, filename pattern, MIME type.
- Trigger throttle (loop 6 exports) → expect destructive toast.

Also extend `e2e/newsletter-subscribers.spec.ts` to assert the audit log gains entries after each admin action.

## 5. USSD made fully functional

Issues today: cart only stores last product; "Buy Now" sends `orderId: "ussd-<sessionId>"` with no DB row, M-Pesa callback can't reconcile; phone normalization is loose; no quantity prompt.

Fixes (`supabase/functions/ussd-handler/index.ts` + new helper):
- Normalize MSISDN via shared `normalizePhone()` (strip `+`, ensure `2547xxxxxxxx`).
- Replace ad-hoc session_data with a proper cart array `{ product_id, qty, unit_price }[]` persisted on `ussd_sessions`.
- Add menu states: list → detail → quantity prompt → add-to-cart vs checkout → confirm.
- On checkout: create real `orders` + `order_items` rows for the matched profile (if found by phone) or guest stub; call `initiate-mpesa-payment` with the new `orderId`.
- Order tracking: accept the short order prefix and look up via `ilike id::text || '%' = $1 || '%'`.
- Update support contact text to use the official `+254 700 116 655`.
- New tests `supabase/functions/ussd-handler/index.test.ts` — main menu, shop happy path, track-order branches, invalid input.

Also wire a tiny visual upgrade to `src/pages/Ussd.tsx` so the simulator shows live state per menu step using the new flow.

## 6. UI/UX polish + realistic imagery

**Imagery (mix strategy)**
- AI-generated (premium, Kenya-context): hero composting scene, USSD farmer using feature phone, education cover.
- Curated Unsplash URLs (kept in `src/lib/stockImages.ts`): incidental product placeholders, blog/article fallbacks, testimonial avatars.
- Replace clearly-placeholder images in: `HeroSection`, `FeaturesSection`, `HowItWorksSection`, `TestimonialsSection`, `Education` cards, `Ussd` page hero.
- All new assets respect Captain Compost palette and use `loading="lazy"` + descriptive `alt`.

**UX polish**
- Tighten landing rhythm: consistent section padding, increased contrast on CTAs, focus-visible rings.
- Admin Audit Log: sticky table header, zebra rows, keyboard-navigable rows (`role="button"`, Enter to open sheet), visible filter chips.
- Newsletter Manager: skeleton rows during load, empty-state illustration.
- Respect framer-motion rule (`viewport={{ once: true, amount: 0 }}`).

## Technical changes & files

**New**
- `supabase/migrations/<ts>_audit_search_and_rls_hardening.sql` — `search_audit_log` RPC, `get_audit_admin_names` RPC, deny INSERT/UPDATE/DELETE policies, REVOKE/GRANTs.
- `supabase/functions/export-admin-audit-log/index.ts` + `index.test.ts`.
- `supabase/functions/ussd-handler/index.test.ts`.
- `src/lib/stockImages.ts` — curated image map.
- `src/assets/hero-compost.jpg`, `ussd-feature-phone.jpg`, `education-cover.jpg` (premium imagegen).

**Edited**
- `src/components/admin/AuditLogTable.tsx` — toggle filter, RPC calls, server-side export call, sticky header.
- `src/components/admin/__tests__/AuditLogTable.test.tsx`.
- `src/components/admin/NewsletterSubscribersManager.tsx` — skeletons, empty state.
- `supabase/functions/ussd-handler/index.ts` — full state machine, real orders, phone normalization, official support number.
- `src/pages/Ussd.tsx` — refreshed simulator, AI hero image.
- `src/components/landing/{HeroSection,FeaturesSection,HowItWorksSection,TestimonialsSection}.tsx` — image swaps, spacing.
- `e2e/admin-audit-log.spec.ts`, `e2e/newsletter-subscribers.spec.ts`.
- `mem://features/admin/audit-log` updated to note new RPC + export edge function.

## Risks & mitigations
- **RLS lockouts**: the linter is run after the migration; explicit GRANTs verified for `authenticated`.
- **Large CSV**: edge function streams in 1 000-row chunks to stay under memory limits.
- **USSD regressions**: Africa's Talking gateway can't be hit from CI, so logic is covered by Deno tests with mocked Supabase client.
- **Image generation cost**: only 3 premium hero shots; everything else uses Unsplash URLs.
