import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const body = await req.json();
    console.log("M-Pesa callback received:", JSON.stringify(body));

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

    // Idempotency guard: only update the payment row if it's still pending.
    // A duplicate callback from Safaricom will match 0 rows and skip the order update path.
    const { data: payment, error: updateError } = await serviceClient
      .from("payments")
      .update({
        status: newStatus,
        result_code: ResultCode,
        result_description: ResultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
      })
      .eq("mpesa_checkout_request_id", CheckoutRequestID)
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
