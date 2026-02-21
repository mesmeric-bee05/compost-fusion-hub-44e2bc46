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

const buildEmailHtml = (data: OrderStatusEmailRequest, customerEmail: string, info: typeof statusMessages[string]) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${info.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:${info.color};padding:32px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">🌿 CaptainCompost</p>
              <h1 style="color:#ffffff;margin:16px 0 0;font-size:26px;font-weight:700;">${info.headline}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="font-size:16px;color:#374151;margin:0 0 16px;">Hi ${data.customerName},</p>
              <p style="font-size:16px;color:#374151;margin:0 0 32px;line-height:1.6;">${info.body}</p>

              <!-- Order Summary Box -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px;margin-bottom:32px;">
                <h3 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Order Summary</h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#374151;">Order ID</td>
                    <td style="padding:6px 0;font-size:14px;color:#374151;text-align:right;font-family:monospace;">${data.orderId.slice(0, 8).toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#374151;">Status</td>
                    <td style="padding:6px 0;text-align:right;">
                      <span style="background:${info.color}20;color:${info.color};font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;text-transform:capitalize;">${data.orderStatus}</span>
                    </td>
                  </tr>
                  <tr style="border-top:1px solid #e5e7eb;">
                    <td style="padding:12px 0 6px;font-size:15px;font-weight:600;color:#111827;">Total Amount</td>
                    <td style="padding:12px 0 6px;font-size:15px;font-weight:700;color:${info.color};text-align:right;">${formatKES(data.totalAmount)}</td>
                  </tr>
                  ${data.deliveryAddress ? `
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#6b7280;">Delivery Address</td>
                    <td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right;max-width:200px;">${data.deliveryAddress}</td>
                  </tr>
                  ` : ""}
                </table>
              </div>

              <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 8px;">
                Questions about your order? Contact us at 
                <a href="mailto:info@captaincompost.co.ke" style="color:#22c55e;">info@captaincompost.co.ke</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">© 2026 Captain Compost · Nairobi, Kenya</p>
              <p style="margin:8px 0 0;font-size:12px;color:#d1d5db;">Turning Waste Into Wealth for Kenya 🌱</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured — skipping email");
      return new Response(JSON.stringify({ skipped: true, reason: "RESEND_API_KEY not configured" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body: OrderStatusEmailRequest = await req.json();
    const { orderId, orderStatus, customerName, totalAmount, deliveryAddress, userId } = body;

    const info = statusMessages[orderStatus];
    if (!info) {
      return new Response(JSON.stringify({ skipped: true, reason: "No email template for status: " + orderStatus }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Look up user email using service role (bypasses RLS)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      throw new Error(`Could not resolve user email for userId=${userId}: ${userError?.message}`);
    }

    const customerEmail = userData.user.email;
    const html = buildEmailHtml(body, customerEmail, info);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Captain Compost <onboarding@resend.dev>",  // Change to orders@captaincompost.co.ke after verifying domain on Resend
        to: [customerEmail],
        subject: info.subject,
        html,
      }),
    });

    const responseText = await emailRes.text();
    if (!emailRes.ok) {
      throw new Error(`Resend error (${emailRes.status}): ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log(`Order status email sent to ${customerEmail} for order ${orderId} (${orderStatus}):`, result.id);

    return new Response(JSON.stringify({ success: true, id: result.id, to: customerEmail }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-order-status-email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
