# WhatsApp Business Cloud API — Setup

The `whatsapp-webhook` edge function is deployed and ready, but it does **not**
send messages until the following runtime secrets are set:

| Secret | Where to get it |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | Any random string you choose; paste the same value into Meta's webhook config. |
| `WHATSAPP_TOKEN` | Meta App → WhatsApp → API Setup → Permanent access token. |
| `WHATSAPP_PHONE_ID` | Meta App → WhatsApp → API Setup → "From" phone number ID. |

## Configure the webhook in Meta

1. In Meta App Dashboard → **WhatsApp** → **Configuration**, set
   - **Callback URL**: `https://keamtdezbeheryzfaqzt.supabase.co/functions/v1/whatsapp-webhook`
   - **Verify token**: the value of `WHATSAPP_VERIFY_TOKEN`
2. Click **Verify and save**. Meta will GET the URL with `hub.challenge`; the
   function will echo it back when the token matches.
3. Subscribe to the **messages** webhook field.

## Inbound commands the bot understands

| User text | Reply |
|---|---|
| `menu` / `hi` / `hello` / `start` | Main menu |
| `order <ref>` | Status + total for the matching order (first 8 chars of UUID) |
| `ussd` | Reminder of `*384*555#` |
| `shop` | Link to the store |
| `call` | Phone number |

## Outbound notifications

Call `sendWhatsAppText(phone, body)` from any other edge function. It silently
no-ops if `WHATSAPP_TOKEN` is not set, so it's safe to wire it into
`mpesa-callback` etc. before secrets land.

## Rate limiting

Per-IP: 200 events / minute via `check_rate_limit` RPC.
Meta retries on non-2xx, so this function returns `200` on every error path.
