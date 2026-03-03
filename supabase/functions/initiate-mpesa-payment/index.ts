import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StkRequest {
  orderId: string;
  phone: string;
  amount: number;
}

async function getMpesaAccessToken(): Promise<string> {
  const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY")!;
  const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET")!;
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);

  const res = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get M-Pesa access token");
  return data.access_token;
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+254")) cleaned = cleaned.slice(1);
  else if (cleaned.startsWith("0")) cleaned = "254" + cleaned.slice(1);
  else if (!cleaned.startsWith("254")) cleaned = "254" + cleaned;
  return cleaned;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { orderId, phone, amount }: StkRequest = await req.json();
    if (!orderId || !phone || !amount) throw new Error("Missing orderId, phone, or amount");

    const formattedPhone = formatPhone(phone);
    const shortcode = Deno.env.get("MPESA_SHORTCODE")!;
    const passkey = Deno.env.get("MPESA_PASSKEY")!;
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    // Use service role to insert payment record
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get M-Pesa access token
    const accessToken = await getMpesaAccessToken();

    // Build callback URL
    const projectId = supabaseUrl.replace("https://", "").split(".")[0];
    const callbackUrl = `https://${projectId}.supabase.co/functions/v1/mpesa-callback`;

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
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
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
    console.log("STK Push response:", JSON.stringify(stkData));

    if (stkData.ResponseCode !== "0") {
      throw new Error(stkData.errorMessage || stkData.ResponseDescription || "STK Push failed");
    }

    // Save payment record
    const { error: insertError } = await serviceClient.from("payments").insert({
      order_id: orderId,
      user_id: user.id,
      phone_number: formattedPhone,
      amount: Math.ceil(amount),
      mpesa_checkout_request_id: stkData.CheckoutRequestID,
      mpesa_merchant_request_id: stkData.MerchantRequestID,
      status: "pending",
    });

    if (insertError) throw new Error(`Failed to save payment: ${insertError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID,
        message: "STK push sent. Check your phone.",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("initiate-mpesa-payment error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
