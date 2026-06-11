# Africa's Talking USSD Callback Setup

The `ussd-handler` Edge Function requires the `AT_CALLBACK_SECRET` shared secret
on every request (fail-closed). Configure the secret in two places:

## 1. Lovable Cloud
`AT_CALLBACK_SECRET` is already stored as an edge secret. Rotate it through
**Settings → Backend → Secrets** if needed.

## 2. Africa's Talking dashboard
Africa's Talking does **not** allow custom headers on USSD callbacks, so the
secret is passed as a query parameter on the callback URL.

1. Sign in to https://account.africastalking.com
2. Navigate to **USSD → Service Codes → *384*555#**
3. Set the **Callback URL** to:

   ```
   https://<project-ref>.supabase.co/functions/v1/ussd-handler?secret=<AT_CALLBACK_SECRET>
   ```

4. Save. The function performs a constant-time comparison of `secret` against
   the stored `AT_CALLBACK_SECRET`. Mismatches return HTTP 401.

## Verification

```bash
# Should return 401
curl -i https://<project-ref>.supabase.co/functions/v1/ussd-handler \
  -F sessionId=test -F phoneNumber=+254700000000 -F text=""

# Should return "CON Welcome to Captain Compost..."
curl -i "https://<project-ref>.supabase.co/functions/v1/ussd-handler?secret=$AT_CALLBACK_SECRET" \
  -F sessionId=test -F phoneNumber=+254700000000 -F text=""
```
