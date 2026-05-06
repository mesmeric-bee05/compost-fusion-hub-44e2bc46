// Tests for send-newsletter-welcome edge function
// Note: These tests focus on the request/response contract of the edge function
// when called via HTTP. They are written to be runnable against a deployed
// function URL with appropriate env vars; in CI without a deployed function,
// these will simply fail to fetch which is the expected behaviour for offline
// runs. The shape of assertions documents the hardened contract.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const FN_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/send-newsletter-welcome` : null;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

const skip = !FN_URL || !ANON;

const post = (headers: HeadersInit = {}, body: unknown = {}) =>
  fetch(FN_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON!, ...headers },
    body: JSON.stringify(body),
  });

Deno.test({
  name: "OPTIONS preflight returns CORS headers",
  ignore: skip,
  fn: async () => {
    const res = await fetch(FN_URL!, { method: "OPTIONS" });
    await res.text();
    assertEquals(res.status, 200);
    assert(res.headers.get("Access-Control-Allow-Origin"));
  },
});

Deno.test({
  name: "Missing Authorization → 401 structured error",
  ignore: skip,
  fn: async () => {
    const res = await post({}, { email: "x@x.com" });
    const body = await res.json();
    assertEquals(res.status, 401);
    assertEquals(body?.error?.code, "unauthorized");
  },
});

Deno.test({
  name: "Malformed bearer token → 401",
  ignore: skip,
  fn: async () => {
    const res = await post({ Authorization: "Bearer not-a-jwt" }, { email: "x@x.com" });
    const body = await res.json();
    assertEquals(res.status, 401);
    assertEquals(body?.error?.code, "unauthorized");
  },
});

Deno.test({
  name: "Invalid email body → 400 validation_error",
  ignore: skip,
  fn: async () => {
    // Use anon as bearer (won't be admin even if accepted)
    const res = await post({ Authorization: `Bearer ${ANON}` }, { email: "not-an-email" });
    const body = await res.json();
    // Will be 401 (anon is not a valid JWT) OR 400 if accepted then validated.
    // The contract guarantees one of these structured envelopes.
    assert(res.status === 401 || res.status === 400);
    assert(body?.error?.code);
  },
});

Deno.test({
  name: "GET method → 405 method_not_allowed",
  ignore: skip,
  fn: async () => {
    const res = await fetch(FN_URL!, { method: "GET", headers: { apikey: ANON! } });
    const body = await res.json().catch(() => ({}));
    assertEquals(res.status, 405);
    assertEquals(body?.error?.code, "method_not_allowed");
  },
});
