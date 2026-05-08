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

const FilterSchema = z.object({
  action: z.string().max(64).optional().nullable(),
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
  emailQuery: z.string().max(255).optional().nullable(),
  emails: z.array(z.string().email().max(255)).max(100).optional().nullable(),
  mode: z.enum(["contains", "multi-exact"]).default("contains"),
});

const errorResponse = (
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) =>
  new Response(JSON.stringify({ error: { code, message, ...(extra ?? {}) } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const csvEscape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("method_not_allowed", "Only POST is allowed", 405);

  try {
    // 1. Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return errorResponse("unauthorized", "Missing or malformed Authorization header", 401);
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token || token.split(".").length !== 3) {
      return errorResponse("unauthorized", "Invalid bearer token", 401);
    }

    // 2. Resolve caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return errorResponse("unauthorized", "Invalid or expired session", 401);
    }
    const adminId = claimsData.claims.sub as string;

    // 3. Admin role check
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: adminId,
      _role: "admin",
    });
    if (roleErr) return errorResponse("server_error", roleErr.message, 500);
    if (!isAdmin) return errorResponse("forbidden", "Admin role required", 403);

    // 4. Rate limit (DB-backed via admin_audit_log action='audit.export')
    const PER_MIN = Number(Deno.env.get("AUDIT_EXPORT_PER_MIN") ?? 5);
    const PER_HOUR = Number(Deno.env.get("AUDIT_EXPORT_PER_HOUR") ?? 30);
    const GLOBAL_HOUR = Number(Deno.env.get("AUDIT_EXPORT_GLOBAL_HOUR") ?? 100);
    const nowMs = Date.now();
    const minAgo = new Date(nowMs - 60_000).toISOString();
    const hourAgo = new Date(nowMs - 3_600_000).toISOString();

    const checkLimit = async (
      filter: (q: any) => any,
      limit: number,
      windowSeconds: number,
      scope: "admin_minute" | "admin_hour" | "global_hour",
    ) => {
      const base = adminClient
        .from("admin_audit_log")
        .select("created_at", { count: "exact" })
        .eq("action", "audit.export")
        .order("created_at", { ascending: true })
        .limit(1);
      const { data, count, error } = await filter(base);
      if (error) throw error;
      if ((count ?? 0) >= limit) {
        const oldest = data?.[0]?.created_at ? new Date(data[0].created_at).getTime() : nowMs;
        const retryAfter = Math.max(1, Math.ceil((oldest + windowSeconds * 1000 - nowMs) / 1000));
        return { throttled: true as const, retryAfter, scope, limit };
      }
      return { throttled: false as const };
    };

    try {
      const checks = [
        await checkLimit((q) => q.eq("admin_id", adminId).gte("created_at", minAgo), PER_MIN, 60, "admin_minute"),
        await checkLimit((q) => q.eq("admin_id", adminId).gte("created_at", hourAgo), PER_HOUR, 3600, "admin_hour"),
        await checkLimit((q) => q.gte("created_at", hourAgo), GLOBAL_HOUR, 3600, "global_hour"),
      ];
      const breach = checks.find((c) => c.throttled);
      if (breach && breach.throttled) {
        return new Response(
          JSON.stringify({
            error: {
              code: "throttled",
              message: `Too many exports. Try again in ${breach.retryAfter}s.`,
              retry_after: breach.retryAfter,
              scope: breach.scope,
              limit: breach.limit,
            },
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": String(breach.retryAfter),
            },
          },
        );
      }
    } catch (e) {
      console.error("rate-limit check failed", e);
    }

    // 5. Validate body
    let json: unknown = {};
    try {
      const text = await req.text();
      json = text ? JSON.parse(text) : {};
    } catch {
      return errorResponse("bad_request", "Invalid JSON body", 400);
    }
    const parsed = FilterSchema.safeParse(json);
    if (!parsed.success) {
      return errorResponse("validation_error", "Invalid filters", 400, {
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const f = parsed.data;

    // 6. Stream chunks via search_audit_log RPC
    const CHUNK = 1000;
    const MAX_ROWS = 100_000;
    let offset = 0;
    let total = 0;
    const header = ["created_at", "admin_id", "action", "target_count", "target_emails", "metadata"];
    const lines: string[] = [header.join(",")];

    while (offset < MAX_ROWS) {
      const { data, error } = await adminClient.rpc("search_audit_log", {
        _action: f.action ?? null,
        _from: f.from ?? null,
        _to: f.to ?? null,
        _email_query: f.mode === "contains" ? (f.emailQuery ?? null) : null,
        _emails: f.mode === "multi-exact" ? (f.emails ?? null) : null,
        _mode: f.mode,
        _limit: CHUNK,
        _offset: offset,
      });
      if (error) return errorResponse("server_error", error.message, 500);
      const rows = (data ?? []) as Array<{
        created_at: string;
        admin_id: string;
        action: string;
        target_count: number;
        target_emails: string[] | null;
        metadata: Record<string, unknown> | null;
      }>;
      if (!rows.length) break;
      for (const r of rows) {
        lines.push(
          [
            csvEscape(r.created_at),
            csvEscape(r.admin_id),
            csvEscape(r.action),
            csvEscape(r.target_count),
            csvEscape((r.target_emails ?? []).join(";")),
            csvEscape(JSON.stringify(r.metadata ?? {})),
          ].join(","),
        );
      }
      total += rows.length;
      if (rows.length < CHUNK) break;
      offset += CHUNK;
    }

    // 7. Audit log this export
    try {
      await adminClient.rpc("log_admin_action", {
        _admin_id: adminId,
        _action: "audit.export",
        _emails: [],
        _metadata: { filters: f, exported: total },
      });
    } catch (_) {
      // best-effort
    }

    const csv = lines.join("\n");
    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admin-audit-log-${
          new Date().toISOString().slice(0, 10)
        }.csv"`,
        "X-Export-Count": String(total),
      },
    });
  } catch (e) {
    return errorResponse("server_error", (e as Error).message, 500);
  }
});
