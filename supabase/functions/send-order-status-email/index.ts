import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderStatusEmailRequest {
  orderId: string;
  orderStatus: string;
  customerName: string;
  totalAmount: number;
  deliveryAddress?: string | null;
  userId: string;
}

const statusMessages: Record<string, { subject: string; headline: string; body: string; color: string }> = {
  payment_pending: {
    subject: "We've sent an M-Pesa request to your phone 📲",
    headline: "Awaiting Payment",
    body: "Check your phone for the M-Pesa STK prompt and enter your PIN to complete the payment. We'll email you again as soon as it goes through.",
    color: "#f59e0b",
  },
  payment_completed: {
    subject: "Payment received — order confirmed! 🌱",
    headline: "Payment Received",
    body: "Your M-Pesa payment has been received and your order is now confirmed. We're preparing it for dispatch.",
    color: "#22c55e",
  },
  payment_failed: {
    subject: "Your M-Pesa payment did not complete",
    headline: "Payment Failed",
    body: "We weren't able to confirm your M-Pesa payment. No money was deducted in most cases. You can safely try again from your cart.",
    color: "#ef4444",
  },
  confirmed: {
    subject: "Your order has been confirmed! 🌱",
    headline: "Order Confirmed",
    body: "Great news! We've confirmed your order and it's now being prepared for dispatch.",
    color: "#3b82f6",
  },
  shipped: {
    subject: "Your order is on its way! 🚚",
    headline: "Order Shipped",
    body: "Your order has been shipped and is on its way to you. You'll receive it soon!",
    color: "#8b5cf6",
  },
  delivered: {
    subject: "Your order has been delivered! ✅",
    headline: "Order Delivered",
    body: "Your order has been successfully delivered. Thank you for choosing Captain Compost!",
    color: "#22c55e",
  },
  cancelled: {
    subject: "Your order has been cancelled",
    headline: "Order Cancelled",
    body: "Your order has been cancelled. If you have any questions, please contact our support team.",
    color: "#ef4444",
  },
};

const formatKES = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

interface OrderItem {
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  product_image: string | null;
}

const buildEmailHtml = (
  data: OrderStatusEmailRequest,
  info: typeof statusMessages[string],
  items: OrderItem[],
  trackingUrl: string,
  mpesaReceipt: string | null,
  discountAmount: number,
) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${info.subject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
<tr><td style="background:${info.color};padding:32px;text-align:center;">
<p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">🌿 CaptainCompost</p>
<h1 style="color:#ffffff;margin:16px 0 0;font-size:26px;font-weight:700;">${info.headline}</h1></td></tr>
<tr><td style="padding:40px 40px 32px;">
<p style="font-size:16px;color:#374151;margin:0 0 16px;">Hi ${data.customerName},</p>
<p style="font-size:16px;color:#374151;margin:0 0 32px;line-height:1.6;">${info.body}</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px;margin-bottom:24px;">
<h3 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Order Summary</h3>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:6px 0;font-size:14px;color:#374151;">Order ID</td><td style="padding:6px 0;font-size:14px;color:#374151;text-align:right;font-family:monospace;">${data.orderId.slice(0, 8).toUpperCase()}</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#374151;">Status</td><td style="padding:6px 0;text-align:right;"><span style="background:${info.color}20;color:${info.color};font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;text-transform:capitalize;">${data.orderStatus.replace(/_/g, " ")}</span></td></tr>
${discountAmount > 0 ? `<tr><td style="padding:6px 0;font-size:14px;color:#374151;">Discount</td><td style="padding:6px 0;font-size:14px;color:#22c55e;text-align:right;">-${formatKES(discountAmount)}</td></tr>` : ""}
<tr style="border-top:1px solid #e5e7eb;"><td style="padding:12px 0 6px;font-size:15px;font-weight:600;color:#111827;">Total Amount</td><td style="padding:12px 0 6px;font-size:15px;font-weight:700;color:${info.color};text-align:right;">${formatKES(data.totalAmount)}</td></tr>
${mpesaReceipt ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">M-Pesa Receipt</td><td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;font-family:monospace;">${mpesaReceipt}</td></tr>` : ""}
${data.deliveryAddress ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Delivery</td><td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;max-width:200px;">${data.deliveryAddress}</td></tr>` : ""}
</table></div>
<div style="text-align:center;margin-bottom:32px;"><a href="${trackingUrl}" style="display:inline-block;background:${info.color};color:#ffffff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Track Your Order →</a></div>
<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0;">Questions? Contact us at <a href="mailto:info@captaincompost.co.ke" style="color:#22c55e;">info@captaincompost.co.ke</a></p>
</td></tr>
<tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
<p style="margin:0;font-size:13px;color:#9ca3af;">© 2026 Captain Compost · Nairobi, Kenya</p>
<p style="margin:8px 0 0;font-size:12px;color:#d1d5db;">Turning Waste Into Wealth for Kenya 🌱</p>
</td></tr></table></td></tr></table></body></html>`;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // AUTH: require either service-role bearer or an admin user JWT.
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
    const isService = bearer === SERVICE_KEY;
    if (!isService) {
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

    const body: OrderStatusEmailRequest = await req.json();
    const { orderId, orderStatus, totalAmount, deliveryAddress, userId } = body;

    if (!orderId || !orderStatus || !userId) {
      return new Response(JSON.stringify({ error: "Missing orderId, orderStatus, or userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const info = statusMessages[orderStatus];
    if (!info) {
      return new Response(JSON.stringify({ skipped: true, reason: "No template for status: " + orderStatus }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    // Look up trusted customer name server-side; never trust client-supplied value.
    const { data: profileRow } = await adminClient
      .from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
    const customerName = profileRow?.full_name?.trim() || "Valued Customer";
    const trustedBody = { orderId, orderStatus, customerName, totalAmount, deliveryAddress, userId };


    // Idempotency: claim the (order, status) row first; if it already exists, skip.
    const { error: claimError } = await adminClient
      .from("order_email_log")
      .insert({ order_id: orderId, status: orderStatus });

    if (claimError) {
      if (claimError.code === "23505") {
        return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      throw new Error(`order_email_log insert failed: ${claimError.message}`);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ skipped: true, reason: "RESEND_API_KEY not configured" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) throw new Error(`Could not resolve email for ${userId}: ${userError?.message}`);
    const customerEmail = userData.user.email;

    const { data: orderItems } = await adminClient
      .from("order_items")
      .select("quantity, unit_price, total_price, product_id")
      .eq("order_id", orderId);

    let items: OrderItem[] = [];
    if (orderItems?.length) {
      const productIds = orderItems.map((oi) => oi.product_id);
      const { data: products } = await adminClient
        .from("products").select("id, name, image_url").in("id", productIds);
      const productMap = new Map(products?.map((p) => [p.id, p]) ?? []);
      items = orderItems.map((oi) => {
        const prod = productMap.get(oi.product_id);
        return {
          quantity: oi.quantity,
          unit_price: oi.unit_price,
          total_price: oi.total_price,
          product_name: prod?.name || "Product",
          product_image: prod?.image_url || null,
        };
      });
    }

    const { data: payment } = await adminClient
      .from("payments").select("mpesa_receipt_number")
      .eq("order_id", orderId).eq("status", "completed")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const { data: orderData } = await adminClient
      .from("orders").select("discount_amount").eq("id", orderId).single();

    const trackingUrl = `https://compost-fusion-hub.lovable.app/orders/${orderId}`;
    const html = buildEmailHtml(trustedBody, info, items, trackingUrl,
      payment?.mpesa_receipt_number || null, orderData?.discount_amount || 0);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: "Captain Compost <orders@captaincompost.co.ke>",
        to: [customerEmail],
        subject: info.subject,
        html,
      }),
    });

    const responseText = await emailRes.text();
    if (!emailRes.ok) {
      // Roll back the idempotency claim so a retry can succeed.
      await adminClient.from("order_email_log").delete().eq("order_id", orderId).eq("status", orderStatus);
      throw new Error(`Resend error (${emailRes.status}): ${responseText}`);
    }

    const result = JSON.parse(responseText);
    await adminClient.from("order_email_log").update({ resend_id: result.id })
      .eq("order_id", orderId).eq("status", orderStatus);

    console.log(`Order email sent → ${customerEmail} order=${orderId} status=${orderStatus} resend=${result.id}`);

    return new Response(JSON.stringify({ success: true, id: result.id, to: customerEmail }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-order-status-email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
