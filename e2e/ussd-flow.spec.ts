import { test, expect } from "@playwright/test";
import {
  postUssd,
  seedUssdProduct,
  clearUssdSession,
  getUssdSession,
  getOrderByPrefix,
  deleteProduct,
} from "./helpers/seed";

const PHONE = "+254700116000";

const sid = () => `e2e-ussd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// All USSD tests skip the storageState / browser; we POST directly.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("USSD state machine", () => {
  test("main menu renders the six top-level options", async () => {
    const sessionId = sid();
    const r = await postUssd({ sessionId, phoneNumber: PHONE, text: "" });
    expect(r.status).toBe(200);
    expect(r.text).toMatch(/CON Welcome to Captain Compost/);
    expect(r.text).toMatch(/1\. Shop Products/);
    expect(r.text).toMatch(/6\. View Cart/);
    await clearUssdSession(sessionId);
  });

  test("compost tip ENDs with a tip", async () => {
    const r = await postUssd({ sessionId: sid(), phoneNumber: PHONE, text: "4" });
    expect(r.text.startsWith("END")).toBe(true);
    expect(r.text).toMatch(/Tip/);
  });

  test("support shows the official phone", async () => {
    const r = await postUssd({ sessionId: sid(), phoneNumber: PHONE, text: "5" });
    expect(r.text).toMatch(/\+254 700 116 655/);
  });

  test("track-order rejects too-short ID", async () => {
    const r = await postUssd({ sessionId: sid(), phoneNumber: PHONE, text: "3*abc" });
    expect(r.text).toMatch(/END Order ID too short/);
  });

  test("eco-points unregistered phone → sign-up hint", async () => {
    const r = await postUssd({ sessionId: sid(), phoneNumber: "+254799000111", text: "2" });
    expect(r.text).toMatch(/END Phone not registered/);
  });

  test("shop list → product detail → add-to-cart persists session cart", async () => {
    test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "service role required");
    const product = await seedUssdProduct();
    const sessionId = sid();
    try {
      // 1) shop list
      const list = await postUssd({ sessionId, phoneNumber: PHONE, text: "1" });
      expect(list.text).toMatch(/CON Select a product/);

      // 2) detail (first item)
      const detail = await postUssd({ sessionId, phoneNumber: PHONE, text: "1*1" });
      expect(detail.text).toMatch(/Add to cart/);

      // 3) add-to-cart prompt for qty
      const ask = await postUssd({ sessionId, phoneNumber: PHONE, text: "1*1*1" });
      expect(ask.text).toMatch(/Enter quantity/);

      // 4) qty=2
      const added = await postUssd({ sessionId, phoneNumber: PHONE, text: "1*1*1*2" });
      expect(added.text).toMatch(/Added 2 x/);

      const session = await getUssdSession(sessionId);
      const cart = (session?.session_data as { cart?: Array<{ qty: number }> })?.cart ?? [];
      expect(cart.length).toBeGreaterThanOrEqual(1);
      expect(cart[0].qty).toBe(2);
    } finally {
      await clearUssdSession(sessionId);
      await deleteProduct(product.id);
    }
  });

  test("checkout from cart creates an order row (M-Pesa init is fire-and-forget)", async () => {
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.E2E_USSD_REGISTERED_PHONE,
      "needs a registered phone with a profile (set E2E_USSD_REGISTERED_PHONE)",
    );
    const phone = process.env.E2E_USSD_REGISTERED_PHONE!;
    const product = await seedUssdProduct();
    const sessionId = sid();
    try {
      await postUssd({ sessionId, phoneNumber: phone, text: "1" });
      await postUssd({ sessionId, phoneNumber: phone, text: "1*1" });
      await postUssd({ sessionId, phoneNumber: phone, text: "1*1*1" });
      await postUssd({ sessionId, phoneNumber: phone, text: "1*1*1*1" });

      const checkout = await postUssd({ sessionId, phoneNumber: phone, text: "6*1" });
      expect(checkout.text).toMatch(/END Order [a-f0-9]{8} placed!/);

      const orderIdPrefix = checkout.text.match(/Order ([a-f0-9]{8})/)?.[1];
      expect(orderIdPrefix).toBeTruthy();
      const order = await getOrderByPrefix(orderIdPrefix!);
      expect(order).not.toBeNull();
      expect(Number(order!.total_amount)).toBeGreaterThan(0);
    } finally {
      await clearUssdSession(sessionId);
      await deleteProduct(product.id);
    }
  });

  test("invalid top-level option ENDs gracefully", async () => {
    const r = await postUssd({ sessionId: sid(), phoneNumber: PHONE, text: "9" });
    expect(r.text).toMatch(/END Invalid option/);
  });
});
