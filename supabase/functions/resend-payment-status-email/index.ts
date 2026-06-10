import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_STATUSES = new Set(["payment_pending", "payment_completed", "payment_failed"]);

interface Body {
  orderId?: string;
  status?: string;
  customerName?: string;
  totalAmount?: number;
  deliveryAddress?: string | null;
  userId?: string;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const body: Body = await req.json().catch(() => ({}));
  const { orderId, status, customerName, totalAmount, deliveryAddress, userId } = body;

  if (!orderId || !status || !userId || typeof totalAmount !== "number") {
    return json({ error: "missing_fields" }, 400);
  }
  if (!VALID_STATUSES.has(status)) {
    return json({ error: "invalid_status" }, 400);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate caller is admin via their JWT.
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userInfo, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userInfo?.user) return json({ error: "unauthorized" }, 401);
  const adminId = userInfo.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: hasAdmin } = await admin.rpc("has_role", { _user_id: adminId, _role: "admin" });
  if (!hasAdmin) return json({ error: "forbidden" }, 403);

  // Rate-limit check (uses caller's JWT so the function sees auth.uid()).
  const { data: rate, error: rateErr } = await userClient.rpc("check_email_resend_rate", {
    _order: orderId,
    _status: status,
  });
  if (rateErr) return json({ error: rateErr.message }, 500);
  const rateInfo = rate as {
    allowed: boolean;
    reason?: string;
    retry_after_seconds?: number;
    attempts_in_window?: number;
  };

  if (!rateInfo.allowed) {
    // Audit the rate-limited attempt too.
    await admin.rpc("log_admin_action", {
      _admin_id: adminId,
      _action: "payment_email.resend",
      _emails: [],
      _metadata: {
        order_id: orderId,
        status,
        template: status,
        result: "rate_limited",
        reason: rateInfo.reason,
        retry_after_seconds: rateInfo.retry_after_seconds,
      },
    });
    return json(
      {
        error: "rate_limited",
        reason: rateInfo.reason,
        retry_after_seconds: rateInfo.retry_after_seconds ?? 30,
      },
      429,
    );
  }

  // Record the attempt BEFORE invoking the email send (so concurrent calls hit the cooldown).
  await admin.from("payment_email_resend_attempts").insert({
    order_id: orderId,
    status,
    admin_id: adminId,
  });

  // Clear the prior idempotency claim so send-order-status-email will re-send.
  await admin.from("order_email_log").delete().eq("order_id", orderId).eq("status", status);

  // Invoke the existing email sender.
  const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-order-status-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      orderId,
      orderStatus: status,
      customerName: customerName ?? "Valued Customer",
      totalAmount,
      deliveryAddress: deliveryAddress ?? null,
      userId,
    }),
  });
  const sendJson = (await sendRes.json().catch(() => ({}))) as Record<string, unknown>;

  const result: "sent" | "skipped" | "failed" = sendRes.ok
    ? (sendJson.skipped ? "skipped" : "sent")
    : "failed";

  await admin.rpc("log_admin_action", {
    _admin_id: adminId,
    _action: "payment_email.resend",
    _emails: [],
    _metadata: {
      order_id: orderId,
      status,
      template: status,
      result,
      resend_id: sendJson.id ?? null,
      reason: sendJson.reason ?? null,
      error: result === "failed" ? sendJson : null,
    },
  });

  return json({ ok: true, result, ...sendJson }, sendRes.ok ? 200 : sendRes.status);
});
