import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

const client = URL && ANON ? createClient(URL, ANON) : null;

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

export const E2E_TAG = TAG;
