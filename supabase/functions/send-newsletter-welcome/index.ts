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
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const FROM = "Captain Compost <hello@captaincompost.co.ke>";

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
});

const errorResponse = (
  code: string,
  message: string,
  status: number,
  details?: unknown,
) =>
  new Response(
    JSON.stringify({ error: { code, message, ...(details ? { details } : {}) } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );

const html = (email: string) => `<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#f7faf6;padding:24px;color:#1f2937">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
    <h1 style="color:#16a34a;margin:0 0 12px">Welcome to Captain Compost 🌱</h1>
    <p>Hi there,</p>
    <p>Thanks for subscribing with <strong>${email}</strong>! You'll now receive composting tips, eco-news, and exclusive offers.</p>
    <p><a href="https://captaincompost.co.ke/products" style="background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Shop Products</a></p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px">If this wasn't you, simply ignore this email.</p>
  </div>
</body></html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return errorResponse("method_not_allowed", "Only POST is allowed", 405);
  }

  try {
    if (!RESEND_API_KEY) {
      return errorResponse("config_error", "Email provider not configured", 500);
    }

    // 1. Strict Authorization header check
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return errorResponse("unauthorized", "Missing or malformed Authorization header", 401);
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token || token.split(".").length !== 3) {
      return errorResponse("unauthorized", "Invalid bearer token", 401);
    }

    // 2. Verify token & resolve user via anon client (uses signing keys)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return errorResponse("unauthorized", "Invalid or expired session", 401);
    }
    const adminId = claimsData.claims.sub as string;

    // 3. Admin role check (service role to avoid RLS surprises)
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: adminId,
      _role: "admin",
    });
    if (roleErr) return errorResponse("server_error", roleErr.message, 500);
    if (!isAdmin) return errorResponse("forbidden", "Admin role required", 403);

    // 4. Validate body
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
    const email = parsed.data.email.toLowerCase();

    // 5. Verify subscriber exists
    const { data: sub, error: subErr } = await adminClient
      .from("newsletter_subscribers")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();
    if (subErr) return errorResponse("server_error", subErr.message, 500);
    if (!sub) return errorResponse("not_found", "Subscriber not found", 404);

    // 6. Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Welcome to Captain Compost 🌱",
        html: html(email),
      }),
    });
    const body = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      return errorResponse(
        "email_failed",
        body?.message ?? "Resend API error",
        502,
        body,
      );
    }

    // 7. Audit log (best-effort, don't fail request)
    try {
      await adminClient.rpc("log_admin_action", {
        _admin_id: adminId,
        _action: "newsletter.resend",
        _emails: [email],
        _metadata: { resend_id: body?.id ?? null },
      });
    } catch (_) {
      // swallow audit errors
    }

    return new Response(JSON.stringify({ ok: true, id: body?.id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return errorResponse("server_error", (e as Error).message, 500);
  }
});
