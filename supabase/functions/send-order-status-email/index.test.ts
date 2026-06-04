import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const FN_URL = `${Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-status-email`;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

async function call(body: Record<string, unknown>) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(text); } catch { /* keep empty */ }
  return { status: res.status, json, text };
}

Deno.test("returns 400 when required fields are missing", async () => {
  const r = await call({});
  assertEquals(r.status, 400);
  assert(String(r.json.error).toLowerCase().includes("missing"));
});

Deno.test("returns skipped reply for an unknown orderStatus (no template)", async () => {
  const r = await call({
    orderId: crypto.randomUUID(),
    orderStatus: "nonexistent_status",
    customerName: "Test",
    totalAmount: 100,
    userId: crypto.randomUUID(),
  });
  assertEquals(r.status, 200);
  assertEquals(r.json.skipped, true);
  assert(String(r.json.reason).includes("No template"));
});

Deno.test("template selection: payment_pending / completed / failed are all registered", async () => {
  for (const status of ["payment_pending", "payment_completed", "payment_failed"] as const) {
    const r = await call({
      orderId: crypto.randomUUID(),
      orderStatus: status,
      customerName: "Test",
      totalAmount: 100,
      userId: crypto.randomUUID(),
    });
    // We don't have a real user, so expect either skipped (RESEND_API_KEY not set in test env)
    // or 500 from user lookup — but never "No template" (which would mean status missing).
    if (r.json.reason) {
      assert(!String(r.json.reason).includes("No template"), `template missing for ${status}`);
    }
  }
});
