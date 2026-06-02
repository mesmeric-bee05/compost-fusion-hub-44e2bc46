# Captain Compost

Kenya's composting & organic-waste loop. Order composters with M-Pesa, schedule pickups, earn rewards, and learn how to close the loop.

Built with **Vite + React 18 + TypeScript + Tailwind + shadcn/ui** on top of **Lovable Cloud (Supabase)**.

## Features

- **Storefront**: products, bundles, wishlist, comparison, reviews, coupons
- **Cart & Checkout**: M-Pesa STK Push (rate-limited, idempotent callback)
- **Pickups**: one-time and recurring organic-waste collection
- **Driver app**: assigned orders & pickups, status updates
- **Admin dashboard**: orders, products, content CMS, coupons, bundles, contacts, subscribers, audit log, USSD sessions, analytics
- **Notifications**: in-app, email (Resend), SMS (Africa's Talking), push
- **Gamification**: badges, points, leaderboard
- **USSD**: feature-phone access via Africa's Talking
- **Content**: markdown articles, comments, bookmarks
- **Auth**: email/password + Google, HIBP-protected passwords, RLS on every table
- **i18n-ready**: KES pricing, Swahili labels in key flows
- **SEO**: per-page meta via `<SEO>` helper, JSON-LD, sitemap, robots

## Local development

```sh
bun install
bun run dev              # http://localhost:8080
bun run test             # vitest unit tests
bun run test:e2e         # Playwright E2E
```

## Secrets

All managed via Lovable Cloud → Settings → Secrets. Already configured:

| Name | Purpose |
| --- | --- |
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY` | M-Pesa Daraja STK Push |
| `AT_USERNAME`, `AT_API_KEY` | Africa's Talking SMS & USSD |
| `RESEND_API_KEY` | Email delivery |
| `LOVABLE_API_KEY` | Lovable AI Gateway |
| `SUPABASE_*` | Auto-injected by Cloud |

## M-Pesa sandbox setup

1. Create a Daraja app at <https://developer.safaricom.co.ke>.
2. Use the **Lipa Na M-Pesa Online** product; copy Consumer Key/Secret.
3. Use sandbox shortcode `174379` and the test passkey.
4. Set callback URL to `https://<project-ref>.supabase.co/functions/v1/mpesa-callback`.
5. Test phone: `2547XXXXXXXX` (Safaricom sandbox test numbers).

## Email (Resend) domain verification

The transactional email Edge Function uses Resend. To send from your own domain:

1. Add your domain in the Resend dashboard.
2. Add the SPF/DKIM/DMARC records Resend provides to your DNS.
3. Wait for status → **Verified** (a few minutes typically).
4. Update the `from` address in `supabase/functions/send-*-email/index.ts`.

## Edge functions

Deployed automatically on save. Source in `supabase/functions/*/index.ts`. Key ones:

- `initiate-mpesa-payment` — STK Push, 5 attempts / 10 min per user
- `mpesa-callback` — idempotent payment confirmation + notifications
- `send-order-status-email`, `send-sms-notification`, `send-newsletter-welcome`
- `ussd-handler` — USSD state machine with transition tracking
- `check-badges`, `log-admin-action`, `export-admin-audit-log`

## Database

Postgres on Lovable Cloud. RLS on every table. Sensitive RPCs are `SECURITY DEFINER` with explicit `has_role()` admin checks and `REVOKE ALL ... FROM PUBLIC`.

## Test accounts

See `mem://project/test-accounts` (admin + driver credentials seeded for dev).

## Deployment

Click **Publish** in Lovable to push to `https://compost-fusion-hub.lovable.app` (or your custom domain).
