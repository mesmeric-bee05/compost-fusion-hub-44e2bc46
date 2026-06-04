import { test, expect, request } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { postUssd, seedUssdProduct, clearUssdSession, deleteProduct } from "./helpers/seed";

/**
 * End-to-end USSD → cart → checkout → M-Pesa callback flow.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY for seeding and E2E_USSD_REGISTERED_PHONE
 * for a phone number that already has a profile row.
 */
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const REGISTERED_PHONE = process.env.E2E_USSD_REGISTERED_PHONE ?? "";
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/mpesa-callback`;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("USSD → cart → checkout → M-Pesa", () => {
  test.skip(!SERVICE_KEY || !REGISTERED_PHONE || !SUPABASE_URL,
    "needs SUPABASE_SERVICE_ROLE_KEY, E2E_USSD_REGISTERED_PHONE, E2E_SUPABASE_URL");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const sid = () => `e2e-ussd-mpesa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  test("places order via USSD, confirms via M-Pesa callback, idempotent on replay", async () => {
    const product = await seedUssdProduct();
    const sessionId = sid();
    let orderId: string | null = null;
    try {
      // Walk through USSD menus: shop → first product → add → qty 1 → cart → checkout
      await postUssd({ sessionId, phoneNumber: REGISTERED_PHONE, text: "1" });
      await postUssd({ sessionId, phoneNumber: REGISTERED_PHONE, text: "1*1" });
      await postUssd({ sessionId, phoneNumber: REGISTERED_PHONE, text: "1*1*1" });
      await postUssd({ sessionId, phoneNumber: REGISTERED_PHONE, text: "1*1*1*1" });
      const checkout = await postUssd({ sessionId, phoneNumber: REGISTERED_PHONE, text: "6*1" });
      const prefix = checkout.text.match(/Order ([a-f0-9]{8})/)?.[1];
      expect(prefix, "USSD checkout response should include an order id prefix").toBeTruthy();

      // Resolve the full order id and corresponding pending payment.
      const { data: order } = await admin.from("orders").select("id, status, user_id")
        .ilike("id::text", `${prefix}%`).limit(1).single();
      orderId = order!.id;
      expect(order!.status).toBe("pending");

      // The ussd-handler initiates M-Pesa fire-and-forget; if the live STK push
      // didn't create a payment row (sandbox keys may be missing), insert one.
      const { data: existing } = await admin.from("payments").select("id, mpesa_checkout_request_id")
        .eq("order_id", orderId).maybeSingle();
      const checkoutId = existing?.mpesa_checkout_request_id ?? `ws_CO_e2e_${Date.now()}`;
      if (!existing) {
        await admin.from("payments").insert({
          order_id: orderId, user_id: order!.user_id, phone_number: REGISTERED_PHONE.replace(/\+/, ""),
          amount: Number(product.price), mpesa_checkout_request_id: checkoutId, status: "pending",
        });
      }

      const successBody = {
        Body: { stkCallback: {
          MerchantRequestID: "m-e2e", CheckoutRequestID: checkoutId,
          ResultCode: 0, ResultDesc: "Accepted",
          CallbackMetadata: { Item: [{ Name: "MpesaReceiptNumber", Value: "E2EUSSD001" }] },
        } },
      };

      const ctx = await request.newContext();
      const first = await ctx.post(CALLBACK_URL, { data: successBody });
      expect(first.ok()).toBeTruthy();

      const confirmed = (await admin.from("orders").select("status").eq("id", orderId).single()).data!;
      const payment = (await admin.from("payments").select("status, mpesa_receipt_number, updated_at")
        .eq("order_id", orderId).single()).data!;
      expect(confirmed.status).toBe("confirmed");
      expect(payment.status).toBe("completed");
      expect(payment.mpesa_receipt_number).toBe("E2EUSSD001");

      // Status history records the transition
      const { data: history } = await admin.from("order_status_history")
        .select("status").eq("order_id", orderId);
      expect(history?.map((h) => h.status)).toEqual(expect.arrayContaining(["pending", "confirmed"]));

      // Replay → idempotent (payment unchanged, no duplicate history rows)
      const beforeCount = history?.length ?? 0;
      const replay = await ctx.post(CALLBACK_URL, { data: successBody });
      expect(replay.ok()).toBeTruthy();

      const after = (await admin.from("payments").select("status, updated_at")
        .eq("order_id", orderId).single()).data!;
      expect(after.updated_at).toBe(payment.updated_at);
      const { data: history2 } = await admin.from("order_status_history")
        .select("id").eq("order_id", orderId);
      expect(history2?.length ?? 0).toBe(beforeCount);
    } finally {
      if (orderId) {
        await admin.from("payments").delete().eq("order_id", orderId);
        await admin.from("order_items").delete().eq("order_id", orderId);
        await admin.from("order_status_history").delete().eq("order_id", orderId);
        await admin.from("order_email_log").delete().eq("order_id", orderId);
        await admin.from("orders").delete().eq("id", orderId);
      }
      await clearUssdSession(sessionId);
      await deleteProduct(product.id);
    }
  });
});
