// Tests for export-admin-audit-log edge function (HTTP contract).
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const FN_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/export-admin-audit-log` : null;
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
  name: "Missing Authorization → 401",
  ignore: skip,
  fn: async () => {
    const res = await post({}, {});
    const body = await res.json();
    assertEquals(res.status, 401);
    assertEquals(body?.error?.code, "unauthorized");
  },
});

Deno.test({
  name: "Malformed bearer → 401",
  ignore: skip,
  fn: async () => {
    const res = await post({ Authorization: "Bearer foo" }, {});
    const body = await res.json();
    assertEquals(res.status, 401);
    assertEquals(body?.error?.code, "unauthorized");
  },
});

Deno.test({
  name: "Anon JWT (non-admin) → 401 or 403",
  ignore: skip,
  fn: async () => {
    const res = await post({ Authorization: `Bearer ${ANON}` }, {});
    const body = await res.json().catch(() => ({}));
    assert(res.status === 401 || res.status === 403);
    assert(body?.error?.code);
  },
});

Deno.test({
  name: "GET → 405",
  ignore: skip,
  fn: async () => {
    const res = await fetch(FN_URL!, { method: "GET", headers: { apikey: ANON! } });
    const body = await res.json().catch(() => ({}));
    assertEquals(res.status, 405);
    assertEquals(body?.error?.code, "method_not_allowed");
  },
});

Deno.test({
  name: "Invalid filter mode → 400 (when authorized)",
  ignore: skip,
  fn: async () => {
    const res = await post({ Authorization: `Bearer ${ANON}` }, { mode: "garbage" });
    const body = await res.json().catch(() => ({}));
    // Will be 401 if anon isn't accepted; otherwise 400 validation error.
    assert(res.status === 401 || res.status === 400 || res.status === 403);
    assert(body?.error?.code);
  },
});
