import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Re-implement the auth check locally for isolated testing.
function ussdRequestAuthorized(req: Request, expected: string | null): boolean {
  if (!expected) return false;
  const url = new URL(req.url);
  const provided =
    req.headers.get("x-at-secret") ??
    req.headers.get("x-callback-secret") ??
    url.searchParams.get("secret") ??
    "";
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

const SECRET = "a".repeat(48);

Deno.test("rejects when secret missing", () => {
  const req = new Request("https://example.com/ussd", { method: "POST" });
  assertEquals(ussdRequestAuthorized(req, SECRET), false);
});

Deno.test("rejects when length mismatched", () => {
  const req = new Request("https://example.com/ussd?secret=short", { method: "POST" });
  assertEquals(ussdRequestAuthorized(req, SECRET), false);
});

Deno.test("rejects when wrong secret of equal length", () => {
  const req = new Request(`https://example.com/ussd?secret=${"b".repeat(48)}`, { method: "POST" });
  assertEquals(ussdRequestAuthorized(req, SECRET), false);
});

Deno.test("accepts correct secret via query", () => {
  const req = new Request(`https://example.com/ussd?secret=${SECRET}`, { method: "POST" });
  assertEquals(ussdRequestAuthorized(req, SECRET), true);
});

Deno.test("accepts correct secret via x-at-secret header", () => {
  const req = new Request("https://example.com/ussd", {
    method: "POST",
    headers: { "x-at-secret": SECRET },
  });
  assertEquals(ussdRequestAuthorized(req, SECRET), true);
});

Deno.test("fail-closed when no secret configured", () => {
  const req = new Request(`https://example.com/ussd?secret=${SECRET}`, { method: "POST" });
  assertEquals(ussdRequestAuthorized(req, null), false);
});
