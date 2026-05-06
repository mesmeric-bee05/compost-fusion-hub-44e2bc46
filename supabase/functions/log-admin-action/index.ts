import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_ACTIONS = new Set([
  "newsletter.resend",
  "newsletter.delete",
  "newsletter.bulk_delete",
]);

const BodySchema = z.object({
  action: z.string().min(1).max(64).refine((v) => ALLOWED_ACTIONS.has(v), "Action not allowed"),
  emails: z.array(z.string().email().max(255)).max(10000).default([]),
  metadata: z.record(z.unknown()).optional(),
});

const errorResponse = (code: string, message: string, status: number, details?: unknown) =>
  new Response(
    JSON.stringify({ error: { code, message, ...(details ? { details } : {}) } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("method_not_allowed", "Only POST is allowed", 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return errorResponse("unauthorized", "Missing or malformed Authorization header", 401);
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token || token.split(".").length !== 3) {
      return errorResponse("unauthorized", "Invalid bearer token", 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return errorResponse("unauthorized", "Invalid or expired session", 401);
    }
    const adminId = claimsData.claims.sub as string;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: adminId,
      _role: "admin",
    });
    if (roleErr) return errorResponse("server_error", roleErr.message, 500);
    if (!isAdmin) return errorResponse("forbidden", "Admin role required", 403);

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return errorResponse("bad_request", "Invalid JSON body", 400);
    }
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return errorResponse(
        "validation_error",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }
    const { action, emails, metadata } = parsed.data;

    const { data: logId, error: rpcErr } = await adminClient.rpc("log_admin_action", {
      _admin_id: adminId,
      _action: action,
      _emails: emails,
      _metadata: metadata ?? {},
    });
    if (rpcErr) return errorResponse("server_error", rpcErr.message, 500);

    return new Response(JSON.stringify({ ok: true, id: logId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return errorResponse("server_error", (e as Error).message, 500);
  }
});
