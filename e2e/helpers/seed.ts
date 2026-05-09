import { createClient, SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const client = URL && ANON ? createClient(URL, ANON) : null;
const admin: SupabaseClient | null = URL && SERVICE ? createClient(URL, SERVICE) : null;

const TAG = "e2e+";

export async function seedSubscribers(count: number): Promise<string[]> {
  if (!client) throw new Error("Supabase URL/anon key not configured");
  const emails = Array.from({ length: count }, (_, i) =>
    `${TAG}${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}@example.test`,
  );
  const { error } = await client.from("newsletter_subscribers").insert(emails.map((email) => ({ email })));
  if (error) throw new Error(`Seed failed: ${error.message}`);
  return emails;
}

// ── USSD helpers ────────────────────────────────────────────────────────────
export const USSD_FN_URL = URL ? `${URL}/functions/v1/ussd-handler` : "";

export async function postUssd(params: { sessionId: string; phoneNumber: string; text: string }) {
  if (!URL || !ANON) throw new Error("Supabase URL/anon key not configured");
  const body = new URLSearchParams({
    sessionId: params.sessionId,
    phoneNumber: params.phoneNumber,
    text: params.text,
  });
  const res = await fetch(USSD_FN_URL, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return { status: res.status, text: await res.text() };
}

export async function seedUssdProduct(name = `e2e-prod-${Date.now()}`) {
  if (!admin) throw new Error("Service role key not configured");
  const { data, error } = await admin
    .from("products")
    .insert({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      price: 1500,
      currency: "KES",
      stock_quantity: 10,
      is_active: true,
      category: "composters",
      short_description: "E2E test product",
    })
    .select("id, name, price")
    .single();
  if (error) throw new Error(`seedUssdProduct: ${error.message}`);
  return data!;
}

export async function clearUssdSession(sessionId: string) {
  if (!admin) return;
  await admin.from("ussd_sessions").delete().eq("session_id", sessionId);
}

export async function getUssdSession(sessionId: string) {
  if (!admin) throw new Error("Service role key not configured");
  const { data } = await admin
    .from("ussd_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  return data;
}

export async function getOrderByPrefix(prefix: string) {
  if (!admin) throw new Error("Service role key not configured");
  const { data } = await admin
    .from("orders")
    .select("id, status, total_amount, delivery_phone")
    .ilike("id::text", `${prefix}%`)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function deleteProduct(id: string) {
  if (!admin) return;
  await admin.from("products").delete().eq("id", id);
}

export const E2E_TAG = TAG;
