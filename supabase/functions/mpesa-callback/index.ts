import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    // Per-transaction callback token from URL path: /mpesa-callback/<token>
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const callbackToken = pathParts[pathParts.length - 1] || "";
    // A valid token is 64 hex chars (two stripped UUIDs). Reject anything else
    // — including a legacy callback URL with no token suffix.
    const tokenValid = /^[a-f0-9]{32,128}$/i.test(callbackToken) && callbackToken !== "mpesa-callback";
    if (!tokenValid) {
      console.warn("M-Pesa callback rejected: missing/invalid token");
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Invalid token" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("M-Pesa callback received (token ok)");

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract receipt number from metadata if payment was successful
    let mpesaReceiptNumber: string | null = null;
    if (ResultCode === 0 && CallbackMetadata?.Item) {
      const receiptItem = CallbackMetadata.Item.find(
        (i: { Name: string; Value?: string }) => i.Name === "MpesaReceiptNumber"
      );
      mpesaReceiptNumber = receiptItem?.Value ?? null;
    }

    const newStatus = ResultCode === 0 ? "completed" : "failed";

    // Idempotency + token check: row must match BOTH the CheckoutRequestID AND
    // the per-transaction callback_token, and still be pending. Forged
    // callbacks without the secret token can't pass this gate.
    const { data: payment, error: updateError } = await serviceClient
      .from("payments")
      .update({
        status: newStatus,
        result_code: ResultCode,
        result_description: ResultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
      })
      .eq("mpesa_checkout_request_id", CheckoutRequestID)
      .eq("callback_token", callbackToken)
      .eq("status", "pending")
      .select("order_id, user_id, phone_number, amount")
      .maybeSingle();


    if (updateError) {
      console.error("Failed to update payment:", updateError.message);
    }
    if (!payment) {
      console.log(`Callback for ${CheckoutRequestID} ignored (already processed or unknown)`);
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get order + customer profile (for both success and failure paths)
    const { data: order } = await serviceClient
      .from("orders")
      .select("id, total_amount, delivery_address, user_id")
      .eq("id", payment.order_id)
      .single();

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", payment.user_id)
      .single();
    const customerName = profile?.full_name || "Customer";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const projectId = supabaseUrl.replace("https://", "").split(".")[0];
    const serviceJwt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (ResultCode === 0 && payment.order_id) {
      // Success: confirm order
      const { error: orderError } = await serviceClient
        .from("orders").update({ status: "confirmed" }).eq("id", payment.order_id);
      if (orderError) console.error("Failed to update order:", orderError.message);
      else console.log(`Order ${payment.order_id} confirmed`);

      // Email (idempotent, dedup key = orderId+payment_completed)
      try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/send-order-status-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceJwt}` },
          body: JSON.stringify({
            orderId: payment.order_id,
            orderStatus: "payment_completed",
            customerName,
            totalAmount: order?.total_amount || payment.amount,
            deliveryAddress: order?.delivery_address,
            userId: payment.user_id,
          }),
        });
      } catch (e) { console.error("Email notification failed:", e); }

      // SMS
      try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/send-sms-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceJwt}` },
          body: JSON.stringify({
            phone: payment.phone_number,
            message: `Hi ${customerName}, your Captain Compost order #${payment.order_id.slice(0, 8).toUpperCase()} of KES ${Math.ceil(payment.amount).toLocaleString()} has been confirmed! M-Pesa receipt: ${mpesaReceiptNumber}. 🌿`,
          }),
        });
      } catch (e) { console.error("SMS notification failed:", e); }
    } else if (payment.order_id) {
      // Failure: notify user via email (idempotent)
      try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/send-order-status-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceJwt}` },
          body: JSON.stringify({
            orderId: payment.order_id,
            orderStatus: "payment_failed",
            customerName,
            totalAmount: order?.total_amount || payment.amount,
            deliveryAddress: order?.delivery_address,
            userId: payment.user_id,
          }),
        });
      } catch (e) { console.error("Failure email failed:", e); }
    }

    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("mpesa-callback error:", message);
    return new Response(
      JSON.stringify({ ResultCode: 1, ResultDesc: message }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});
