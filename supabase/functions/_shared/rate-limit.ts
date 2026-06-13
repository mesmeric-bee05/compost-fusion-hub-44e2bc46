// Shared rate-limit helper for Supabase Edge Functions.
// Calls the public.check_rate_limit RPC (service-role only).
//
// Usage:
//   import { enforceRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
//   const rl = await enforceRateLimit(supabaseService, `mpesa:${ip}`, 60, 5);
//   if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retry_after_seconds?: number;
}

export async function enforceRateLimit(
  service: SupabaseClient,
  bucketKey: string,
  windowSeconds: number,
  maxHits: number,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await service.rpc("check_rate_limit", {
      _bucket_key: bucketKey,
      _window_seconds: windowSeconds,
      _max_hits: maxHits,
    });
    if (error) {
      console.error("rate-limit RPC error:", error.message);
      // Fail-open on infra error so legitimate traffic isn't blocked by a DB blip.
      return { allowed: true, count: 0 };
    }
    return data as RateLimitResult;
  } catch (e) {
    console.error("rate-limit exception:", e);
    return { allowed: true, count: 0 };
  }
}

export function rateLimitResponse(
  result: RateLimitResult,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retry_after_seconds: result.retry_after_seconds ?? 60,
    }),
    {
      status: 429,
      headers: {
        ...extraHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retry_after_seconds ?? 60),
      },
    },
  );
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}
