import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SmsRequest {
  phone: string;
  message: string;
}

function formatPhoneForAT(phone: string): string {
  let cleaned = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("254")) cleaned = "+" + cleaned;
  else if (cleaned.startsWith("0")) cleaned = "+254" + cleaned.slice(1);
  else if (!cleaned.startsWith("+254")) cleaned = "+254" + cleaned;
  return cleaned;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AUTH: only service-role or admin users may send SMS via this endpoint.
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!bearer) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (bearer !== SERVICE_KEY) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(bearer);
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const adminCheck = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: isAdmin } = await adminCheck.rpc("has_role", {
        _user_id: claimsData.claims.sub, _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const atApiKey = Deno.env.get("AT_API_KEY");
    const atUsername = Deno.env.get("AT_USERNAME");


    if (!atApiKey || !atUsername) {
      console.warn("Africa's Talking credentials not configured — skipping SMS");
      return new Response(
        JSON.stringify({ skipped: true, reason: "AT credentials not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: SmsRequest = await req.json();
    const { phone, message } = body;

    if (!phone || !message) throw new Error("Missing phone or message");
    if (message.length > 480) throw new Error("Message too long (max 480 chars)");

    const formattedPhone = formatPhoneForAT(phone);

    const params = new URLSearchParams({
      username: atUsername,
      to: formattedPhone,
      message: message,
      from: "CptCompost",
    });

    const smsRes = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: atApiKey,
      },
      body: params.toString(),
    });

    const smsData = await smsRes.json();
    console.log("Africa's Talking SMS response:", JSON.stringify(smsData));

    const recipients = smsData?.SMSMessageData?.Recipients;
    if (recipients && recipients.length > 0) {
      const r = recipients[0];
      if (r.statusCode === 101) {
        return new Response(
          JSON.stringify({ success: true, messageId: r.messageId, cost: r.cost }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        throw new Error(`SMS failed: ${r.status} (code ${r.statusCode})`);
      }
    }

    throw new Error(`Unexpected AT response: ${JSON.stringify(smsData)}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-sms-notification error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
