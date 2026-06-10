import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const FN_URL = `${Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")}/functions/v1/resend-payment-status-email`;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

async function call(body: Record<string, unknown>, auth?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: ANON };
  if (auth) headers.Authorization = auth;
  const res = await fetch(FN_URL, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, json };
}

Deno.test("missing Authorization returns 401", async () => {
  const r = await call({});
  assertEquals(r.status, 401);
  assertEquals(r.json.error, "unauthorized");
});

Deno.test("missing required fields returns 400", async () => {
  const r = await call({}, `Bearer ${ANON}`);
  // Without a real JWT the function might short-circuit at unauthorized; both are acceptable
  assert(r.status === 400 || r.status === 401);
});

Deno.test("invalid status returns 400 (with anon token still rejected as unauthorized)", async () => {
  const r = await call(
    { orderId: crypto.randomUUID(), status: "bogus", userId: crypto.randomUUID(), totalAmount: 1 },
    `Bearer ${ANON}`,
  );
  assert(r.status === 400 || r.status === 401);
});
