import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, rateLimitResponse, clientIp } from "../_shared/rate-limit.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MPESA_ENV = (Deno.env.get("MPESA_ENV") ?? "sandbox").toLowerCase();
const MPESA_BASE_URL = MPESA_ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

interface StkRequest {
  orderId: string;
  phone: string;
  amount: number;
}

async function getMpesaAccessToken(): Promise<string> {
  const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
  if (!consumerKey || !consumerSecret) throw new Error("M-Pesa credentials not configured");

  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  const res = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  const data = await res.json();
  if (!data.access_token) {
    console.error("M-Pesa OAuth failed", { env: MPESA_ENV, status: res.status, body: data });
    throw new Error(
      `M-Pesa credentials rejected (${MPESA_ENV}). Verify MPESA_CONSUMER_KEY/SECRET match the MPESA_ENV environment.`,
    );
  }
  return data.access_token;
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+254")) cleaned = cleaned.slice(1);
  else if (cleaned.startsWith("0")) cleaned = "254" + cleaned.slice(1);
  else if (!cleaned.startsWith("254")) cleaned = "254" + cleaned;
  if (!/^254[17]\d{8}$/.test(cleaned)) throw new Error("Invalid Kenyan phone number");
  return cleaned;
}

// Simple in-memory rate limiter (per edge instance). 5 STK pushes / 10 min per user.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const rateMap = new Map<string, number[]>();
function rateLimitOk(userId: string): boolean {
  const now = Date.now();
  const hits = (rateMap.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) { rateMap.set(userId, hits); return false; }
  hits.push(now);
  rateMap.set(userId, hits);
  return true;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user via getClaims
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");
    const userId = claimsData.claims.sub as string;

    if (!rateLimitOk(userId)) {
      return new Response(
        JSON.stringify({ error: "Too many payment attempts. Please wait a few minutes." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: StkRequest = await req.json();
    const { orderId, phone, amount } = body;
    if (!orderId || !phone || !amount) throw new Error("Missing orderId, phone, or amount");
    if (typeof amount !== "number" || amount <= 0 || amount > 500000) throw new Error("Invalid amount");

    const formattedPhone = formatPhone(phone);
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    if (!shortcode || !passkey) throw new Error("M-Pesa shortcode/passkey not configured");

    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify the order belongs to the user and is pending
    const { data: order, error: orderErr } = await serviceClient
      .from("orders")
      .select("id, user_id, status, total_amount")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");
    if (order.user_id !== userId) throw new Error("Order does not belong to this user");
    if (order.status !== "pending") throw new Error("Order is not in pending status");
    if (Math.ceil(order.total_amount) !== Math.ceil(amount)) throw new Error("Amount mismatch");

    // Check for existing pending payment
    const { data: existingPayment } = await serviceClient
      .from("payments")
      .select("id, status")
      .eq("order_id", orderId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (existingPayment) throw new Error("A payment is already pending for this order. Please wait or try again shortly.");

    const accessToken = await getMpesaAccessToken();

    const projectId = supabaseUrl.replace("https://", "").split(".")[0];

    // Per-transaction secret token — prevents an attacker who knows a
    // CheckoutRequestID from forging a callback. The token is included as a
    // path segment in the callback URL and validated by mpesa-callback.
    const callbackToken = crypto.randomUUID().replace(/-/g, "") +
      crypto.randomUUID().replace(/-/g, "");
    const callbackUrl = `https://${projectId}.supabase.co/functions/v1/mpesa-callback/${callbackToken}`;

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `CC-${orderId.slice(0, 8).toUpperCase()}`,
      TransactionDesc: `Captain Compost Order ${orderId.slice(0, 8)}`,
    };

    const stkRes = await fetch(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(stkPayload),
      }
    );

    const stkData = await stkRes.json();
    console.log("STK Push response:", JSON.stringify({
      ResponseCode: stkData.ResponseCode,
      ResponseDescription: stkData.ResponseDescription,
    }));

    if (stkData.ResponseCode !== "0") {
      throw new Error(stkData.errorMessage || stkData.ResponseDescription || "STK Push failed");
    }

    // Save payment record using service role
    const { error: insertError } = await serviceClient.from("payments").insert({
      order_id: orderId,
      user_id: userId,
      phone_number: formattedPhone,
      amount: Math.ceil(amount),
      mpesa_checkout_request_id: stkData.CheckoutRequestID,
      mpesa_merchant_request_id: stkData.MerchantRequestID,
      callback_token: callbackToken,
      status: "pending",
    });


    if (insertError) throw new Error(`Failed to save payment: ${insertError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "STK push sent. Check your phone.",
      }),

      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("initiate-mpesa-payment error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: message === "Unauthorized" ? 401 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
