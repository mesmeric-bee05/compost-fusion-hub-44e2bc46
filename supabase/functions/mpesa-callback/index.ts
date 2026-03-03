import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // Use service role to bypass RLS
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

    // Update payment record
    const { data: payment, error: updateError } = await serviceClient
      .from("payments")
      .update({
        status: newStatus,
        result_code: ResultCode,
        result_description: ResultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
      })
      .eq("mpesa_checkout_request_id", CheckoutRequestID)
      .select("order_id")
      .single();

    if (updateError) {
      console.error("Failed to update payment:", updateError.message);
    }

    // If payment successful, update order status to confirmed
    if (ResultCode === 0 && payment?.order_id) {
      const { error: orderError } = await serviceClient
        .from("orders")
        .update({ status: "confirmed" })
        .eq("id", payment.order_id);

      if (orderError) {
        console.error("Failed to update order status:", orderError.message);
      } else {
        console.log(`Order ${payment.order_id} confirmed after successful M-Pesa payment`);
      }
    }

    // Respond to Safaricom
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
