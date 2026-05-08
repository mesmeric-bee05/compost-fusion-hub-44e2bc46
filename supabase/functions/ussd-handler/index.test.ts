// USSD handler unit tests — pure logic with a mocked Supabase client.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleUssd, normalizePhone } from "./index.ts";

// Minimal mock of the Supabase client surface we use.
const mockClient = (db: Record<string, any[]>) => {
  const make = (table: string) => {
    let rows = db[table] ?? [];
    let filters: Array<(r: any) => boolean> = [];
    let single = false;
    let maybe = false;
    let limitN: number | null = null;
    let orderKey: string | null = null;
    const builder: any = {
      select: () => builder,
      eq: (col: string, val: any) => { filters.push((r) => r[col] === val); return builder; },
      gt: (col: string, val: any) => { filters.push((r) => r[col] > val); return builder; },
      in: (col: string, vals: any[]) => { filters.push((r) => vals.includes(r[col])); return builder; },
      ilike: (col: string, pat: string) => {
        const p = pat.replace(/%/g, "");
        filters.push((r) => String(r[col.replace("::text", "")]).toLowerCase().startsWith(p));
        return builder;
      },
      order: (k: string) => { orderKey = k; return builder; },
      limit: (n: number) => { limitN = n; return builder; },
      single: () => { single = true; return resolve(); },
      maybeSingle: () => { maybe = true; return resolve(); },
      insert: (payload: any) => {
        const arr = Array.isArray(payload) ? payload : [payload];
        arr.forEach((p) => {
          rows.push({ id: p.id ?? crypto.randomUUID(), ...p });
          db[table] = rows;
        });
        builder._inserted = arr;
        return builder;
      },
      update: (payload: any) => {
        rows = rows.map((r) => filters.every((f) => f(r)) ? { ...r, ...payload } : r);
        db[table] = rows;
        return Promise.resolve({ data: null, error: null });
      },
      upsert: (payload: any) => {
        const arr = Array.isArray(payload) ? payload : [payload];
        arr.forEach((p) => {
          const idx = rows.findIndex((r) => r.session_id === p.session_id);
          if (idx >= 0) rows[idx] = { ...rows[idx], ...p };
          else rows.push({ ...p });
        });
        db[table] = rows;
        return Promise.resolve({ data: null, error: null });
      },
    };
    const resolve = () => {
      let out = rows.filter((r) => filters.every((f) => f(r)));
      if (orderKey) out = [...out].sort((a, b) => (a[orderKey!] > b[orderKey!] ? 1 : -1));
      if (limitN) out = out.slice(0, limitN);
      const data = single || maybe ? (out[0] ?? null) : out;
      return Promise.resolve({ data, error: null });
    };
    builder.then = (cb: any) => resolve().then(cb);
    return builder;
  };
  return { from: (t: string) => make(t) } as any;
};

Deno.test("normalizePhone handles various Kenyan formats", () => {
  assertEquals(normalizePhone("+254712345678"), "254712345678");
  assertEquals(normalizePhone("0712345678"), "254712345678");
  assertEquals(normalizePhone("712345678"), "254712345678");
  assertEquals(normalizePhone("254 712 345 678"), "254712345678");
});

Deno.test("Main menu shows top-level options", async () => {
  const client = mockClient({});
  const out = await handleUssd({ sessionId: "s1", phoneNumber: "+254712345678", text: "", client });
  assertStringIncludes(out, "CON Welcome to Captain Compost");
  assertStringIncludes(out, "1. Shop Products");
  assertStringIncludes(out, "6. View Cart");
});

Deno.test("Shop list returns products from DB", async () => {
  const client = mockClient({
    products: [
      { id: "p1", name: "Composter", price: 1500, currency: "KES", is_active: true, stock_quantity: 5 },
      { id: "p2", name: "Bin", price: 800, currency: "KES", is_active: true, stock_quantity: 0 },
    ],
    ussd_sessions: [],
  });
  const out = await handleUssd({ sessionId: "s1", phoneNumber: "+254712345678", text: "1", client });
  assertStringIncludes(out, "CON Select a product");
  assertStringIncludes(out, "Composter");
  assert(!out.includes("Bin")); // out of stock filtered
});

Deno.test("Support returns official phone number", async () => {
  const out = await handleUssd({ sessionId: "s1", phoneNumber: "+254712345678", text: "5", client: mockClient({}) });
  assertStringIncludes(out, "+254 700 116 655");
});

Deno.test("Compost tip returns ENDed tip", async () => {
  const out = await handleUssd({ sessionId: "s1", phoneNumber: "+254712345678", text: "4", client: mockClient({}) });
  assert(out.startsWith("END"));
  assertStringIncludes(out, "Tip");
});

Deno.test("Invalid top-level option ends gracefully", async () => {
  const out = await handleUssd({ sessionId: "s1", phoneNumber: "+254712345678", text: "9", client: mockClient({}) });
  assertStringIncludes(out, "END Invalid option");
});

Deno.test("Eco-points unregistered phone returns sign-up hint", async () => {
  const client = mockClient({ profiles: [] });
  const out = await handleUssd({ sessionId: "s1", phoneNumber: "+254700000000", text: "2", client });
  assertStringIncludes(out, "END Phone not registered");
});

Deno.test("Track order with too-short ID rejects", async () => {
  const out = await handleUssd({ sessionId: "s1", phoneNumber: "+254712345678", text: "3*abc", client: mockClient({ orders: [] }) });
  assertStringIncludes(out, "END Order ID too short");
});
