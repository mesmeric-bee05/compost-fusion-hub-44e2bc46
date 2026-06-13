
# Captain Compost — Roadmap Gap Audit & Adapted Plan

## 1. Status vs. roadmap

The uploaded roadmap assumes a greenfield Next.js + Prisma + NextAuth + Vercel + Upstash stack on top of a bare HTML prototype. This project is already a production-grade **React 18 + Vite + Supabase (Lovable Cloud)** app, so most "CRITICAL MISSING" items are in fact built. Mapping each roadmap section to current state:

| Roadmap section | Current status | Action |
|---|---|---|
| 1. Brand violations (MyEcoLoop, etc.) | Done — enforced via mem://project/identity, no occurrences in repo | None |
| 2. Migrate off Lovable to Next.js | Not applicable | **Skip** — keep current stack |
| 3.1 Backend + DB schema | Done — 28 Supabase tables incl. orders, products, payments, ussd_sessions, user_badges, etc. | None |
| 3.2 Auth (email + Google + phone OTP) | Email + Google done. **Phone OTP missing.** | Sprint 2 |
| 3.3 M-Pesa Daraja STK + callback | Done — `initiate-mpesa-payment`, `mpesa-callback`, sandbox/prod toggle | None |
| 3.4 USSD via Africa's Talking | Done — `ussd-handler` with AT_CALLBACK_SECRET, session table | None |
| 3.5 WhatsApp Business API | **Only `wa.me` link** — no webhook/templates | Sprint 1 |
| 3.6 Admin dashboard (5 modules) | Overview, Orders, Products, Users, USSD sessions, Audit, Newsletter all done. **USSD menu builder + Impact metrics admin module missing.** | Sprint 3 |
| 3.7 Community forum | Done — `forum_posts`, comments, ProductReviews | None |
| 3.8 Product comparison | Done — `useCompare`, `/compare` | None |
| 3.9 Kenya county coverage map | **Missing** | Sprint 3 |
| 3.10 Personal impact dashboard | Partial — `impact_metrics` table exists, no per-user calculations UI | Sprint 2 |
| 4.1 Security headers / CSP | **Missing** — no CSP meta, no `_headers` file | Sprint 1 |
| 4.2 Rate limiting | Partial — `check_email_resend_rate` only. **No per-IP limits on edge functions.** | Sprint 1 |
| 4.3 Zod validation on edge functions | Partial — needs systematic pass | Sprint 1 |
| 4.4 M-Pesa callback IP allowlist | **Missing** — only signature check via CheckoutRequestID | Sprint 1 |
| 4.5 SQL injection | Safe (RLS + parameterized) | None |
| 5.1 PWA / offline | **Missing** | Sprint 4 |
| 5.2 AI Compost Assistant (RAG) | **Missing** | Sprint 4 |
| 5.3 Composting calendar/reminders | **Missing** | Sprint 4 |
| 5.4 Sub-agent portal & commissions | **Missing** | Sprint 5 |
| 5.5 Real-time order tracking | Done — `OrderTracking.tsx` with Realtime + `payments_safe` | None |
| 5.6 Quote/corporate pipeline | Partial — `contact_submissions` only. **No `quote_requests` table + Kanban.** | Sprint 3 |
| 5.7 Harvest logging | **Missing** | Sprint 5 |
| 6.1 Core Web Vitals | Likely OK; needs Lighthouse audit | Sprint 4 |
| 6.2 SEO metadata + JSON-LD | `<SEO>` component done. **Product/Article JSON-LD missing.** | Sprint 2 |
| 7. CI/CD + monitoring | Security-scan workflow done. **Sentry + uptime missing.** | Sprint 5 |

## 2. Stack adaptation rules (apply throughout)

- Next.js routes → **React Router pages** + **Supabase Edge Functions** for server logic.
- Prisma models → **`supabase/migrations`** SQL with RLS + GRANTs.
- NextAuth → existing **Supabase Auth** (`useAuth`) + new phone OTP flow via Africa's Talking SMS.
- Upstash Redis (rate limits, USSD sessions) → **Postgres tables** + `check_*_rate` SECURITY DEFINER RPCs (already the pattern for email resend).
- Vercel cron → **`pg_cron`** scheduled jobs.
- Cloudinary → existing Supabase Storage buckets (`product-images`, `review-images`, `content-images`).
- Mapbox/Sentry/WhatsApp/AI → add as runtime secrets via `secrets--add_secret` only after user confirms each integration; AI uses **Lovable AI Gateway** (no key).

## 3. Adapted sprint plan

### Sprint 1 — Security hardening & WhatsApp (1 week)
- Add `public/_headers` with full CSP (allow Supabase, Safaricom, AT, Mapbox, Lovable AI), HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- New `api_rate_limits` table + `check_rate_limit(_key, _window, _max)` RPC; call from `initiate-mpesa-payment`, `send-sms-notification`, `resend-payment-status-email`, `ussd-handler`.
- Add Zod-equivalent (zod is already a dep) validation pass on every edge function body/headers.
- Add Safaricom callback IP allowlist (env var `MPESA_CALLBACK_IPS`) to `mpesa-callback`, gated on `MPESA_ENV=production`.
- New `whatsapp-webhook` edge function (GET verify + POST handler) and `lib/whatsapp.ts` for outbound order/payment templates. Requires **WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN** secrets — will request via `secrets--add_secret` after user confirms.

### Sprint 2 — Auth completion, Impact UI, SEO (1 week)
- Phone OTP login: new `phone_otp_codes` table (hashed code, TTL, attempts), `request-otp` and `verify-otp` edge functions reusing `send-sms-notification`. Add OTP step to `LoginForm`.
- Personal impact dashboard widget on `Dashboard.tsx`: derive `wasteKgDiverted`, `compostKgProduced` (×0.4), `co2KgPrevented` (×0.2), trees (÷21), from `impact_metrics` + `collection_requests`.
- JSON-LD `<script type="application/ld+json">` on `ProductDetail`, `Education` article pages, and Organization schema in `<SEO>` defaults.

### Sprint 3 — Admin modules, Coverage map, Quote pipeline (1 week)
- Admin USSD menu builder: new `ussd_menu_items` table (parent_id, label, action, sort_order), CRUD UI under `/admin/ussd-menu`, and switch `ussd-handler` to read from it (with a feature flag fallback to hardcoded tree).
- Admin Impact module: log/edit `impact_metrics` rows, time-series Recharts chart, county breakdown.
- Kenya county coverage map (Leaflet + `kenya-counties.geo.json` from HDX — keeps it Mapbox-token-free). Embedded on `/about` and `/collections`.
- `quote_requests` table + admin Kanban (`pending → qualified → quoted → won/lost`); replace OWC "Custom Quote" CTA with the new form.

### Sprint 4 — Performance, PWA, AI Assistant (1 week)
- Add `vite-plugin-pwa` with stale-while-revalidate for products/articles, cache-first for images; never cache prices or M-Pesa flows.
- Lighthouse pass: image `loading="lazy"`/`fetchpriority="high"` audit, font preconnect, route-level code splitting check.
- AI Compost Assistant: floating chat widget (bottom-left) + `compost-assistant` edge function calling Lovable AI Gateway (`google/gemini-2.5-flash`) with RAG over `content` table articles via pgvector. Adds `content_embeddings` table + nightly `pg_cron` reindex.

### Sprint 5 — Agent portal, Harvest log, Monitoring (1 week)
- `agent_profiles`, `agent_referrals`, `agent_commissions` tables + `/agent` dashboard (role `agent` via `app_role` enum addition).
- `harvest_logs` table + UI on Dashboard with photo upload to `content-images`; awards 25 pts via `check-badges` trigger.
- Sentry: add `@sentry/react` with DSN from new `VITE_SENTRY_DSN` env var; wrap `ErrorBoundary`. Add Uptime Robot config doc in `docs/monitoring.md`.

## 4. Out of scope / explicitly rejected from roadmap

- Migration to Next.js, Prisma, NextAuth, Vercel, Upstash, Cloudinary — current stack already covers these.
- Carbon-credit market integration (speculative, per the doc itself).
- BullMQ background jobs — replaced by `pg_cron`.

## 5. Secrets / external accounts required (will request only on confirmation)

- WhatsApp Business: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`
- Sentry: `VITE_SENTRY_DSN`
- M-Pesa prod callback IP list: `MPESA_CALLBACK_IPS` (comma-separated, from Daraja portal)

No new secrets needed for Sprints 2–4 (Lovable AI Gateway is keyless; Leaflet + HDX GeoJSON need no token).

## 6. Verification per sprint

Each sprint ends with: `supabase--linter` clean, `security--run_security_scan` no new errors, relevant Playwright spec added under `e2e/`, and a manual checkout + USSD smoke test against sandbox.

---

**Next step on approval:** start Sprint 1 (security headers, rate-limit RPC, M-Pesa IP allowlist, WhatsApp webhook scaffold). I'll pause before requesting WhatsApp secrets so you can decide whether to defer that integration.

---

## Sprint 1 progress — 2026-06-13

- ✅ `api_rate_limits` table + `check_rate_limit(_bucket_key,_window_seconds,_max_hits)` RPC (service-role only)
- ✅ Shared helper `supabase/functions/_shared/rate-limit.ts`
- ✅ Rate limiting wired into `initiate-mpesa-payment` (user + IP), `ussd-handler` (IP), `whatsapp-webhook` (IP)
- ✅ Safaricom IP allowlist in `mpesa-callback` (`MPESA_CALLBACK_IPS`, prod-gated, skipped when unset)
- ✅ `public/_headers` with HSTS, CSP (Supabase + Safaricom + AT + Lovable AI + OSM tiles), X-Frame-Options, Referrer-Policy, Permissions-Policy
- ✅ `whatsapp-webhook` edge function deployed (`verify_jwt = false`) + `docs/whatsapp-setup.md`
- ⏳ Pending user decision: add `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` secrets to activate outbound WhatsApp

Next: Sprint 2 (phone OTP login, personal impact dashboard, JSON-LD).
