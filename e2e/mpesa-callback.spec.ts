import { test, expect, request } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Verifies that the deployed mpesa-callback endpoint:
 *  1. Confirms an order on a success callback and writes the M-Pesa receipt.
 *  2. Is idempotent — a duplicate success callback does not re-confirm or mutate state.
 *  3. Leaves the order in pending and marks the payment failed on a failure callback.
 *
 * Requires E2E_SUPABASE_SERVICE_ROLE_KEY (admin seed) — the test is skipped otherwise.
 */
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "https://keamtdezbeheryzfaqzt.supabase.co";
const SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/mpesa-callback`;

test.describe("M-Pesa callback (success + failure + idempotency)", () => {
  test.skip(!SERVICE_KEY, "E2E_SUPABASE_SERVICE_ROLE_KEY not set");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY ?? "anon");

  async function seedOrderWithPendingPayment(checkoutId: string) {
    const { data: user } = await admin.auth.admin.createUser({
      email: `mpesa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
      email_confirm: true,
      password: "TestPass123!",
    });
    const userId = user!.user!.id;

    const { data: order } = await admin.from("orders").insert({
      user_id: userId, total_amount: 100, delivery_address: "Nairobi", delivery_phone: "254712345678",
    }).select().single();

    await admin.from("payments").insert({
      order_id: order!.id, user_id: userId, phone_number: "254712345678",
      amount: 100, mpesa_checkout_request_id: checkoutId, status: "pending",
    });
    return { orderId: order!.id, userId };
  }

  test("success callback confirms order; replay is a no-op (idempotency)", async () => {
    const checkoutId = `ws_CO_${Date.now()}`;
    const { orderId, userId } = await seedOrderWithPendingPayment(checkoutId);

    const successBody = {
      Body: { stkCallback: {
        MerchantRequestID: "m1", CheckoutRequestID: checkoutId,
        ResultCode: 0, ResultDesc: "Accepted",
        CallbackMetadata: { Item: [{ Name: "MpesaReceiptNumber", Value: "QGH7XY12AB" }] },
      } },
    };

    const ctx = await request.newContext();
    const first = await ctx.post(CALLBACK_URL, { data: successBody });
    expect(first.ok()).toBeTruthy();

    let order = (await admin.from("orders").select("status").eq("id", orderId).single()).data!;
    let payment = (await admin.from("payments").select("status, mpesa_receipt_number, updated_at").eq("order_id", orderId).single()).data!;
    expect(order.status).toBe("confirmed");
    expect(payment.status).toBe("completed");
    expect(payment.mpesa_receipt_number).toBe("QGH7XY12AB");

    const firstUpdatedAt = payment.updated_at;

    // Replay — should be a no-op
    const second = await ctx.post(CALLBACK_URL, { data: successBody });
    expect(second.ok()).toBeTruthy();

    payment = (await admin.from("payments").select("status, updated_at").eq("order_id", orderId).single()).data!;
    expect(payment.status).toBe("completed");
    expect(payment.updated_at).toBe(firstUpdatedAt);

    // Cleanup
    await admin.from("payments").delete().eq("order_id", orderId);
    await admin.from("orders").delete().eq("id", orderId);
    await admin.auth.admin.deleteUser(userId);
  });

  test("failure callback marks payment failed; order stays pending", async () => {
    const checkoutId = `ws_CO_fail_${Date.now()}`;
    const { orderId, userId } = await seedOrderWithPendingPayment(checkoutId);

    const failBody = {
      Body: { stkCallback: {
        MerchantRequestID: "m2", CheckoutRequestID: checkoutId,
        ResultCode: 1032, ResultDesc: "Request cancelled by user",
      } },
    };

    const ctx = await request.newContext();
    const res = await ctx.post(CALLBACK_URL, { data: failBody });
    expect(res.ok()).toBeTruthy();

    const order = (await admin.from("orders").select("status").eq("id", orderId).single()).data!;
    const payment = (await admin.from("payments").select("status, result_description").eq("order_id", orderId).single()).data!;
    expect(order.status).toBe("pending");
    expect(payment.status).toBe("failed");
    expect(payment.result_description).toMatch(/cancelled/i);

    await admin.from("payments").delete().eq("order_id", orderId);
    await admin.from("orders").delete().eq("id", orderId);
    await admin.auth.admin.deleteUser(userId);
  });
});
