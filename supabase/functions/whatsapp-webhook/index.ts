// WhatsApp Business Cloud API webhook.
//
// Meta sends a GET with hub.challenge for verification, then POSTs incoming
// messages and status updates. Outbound sending is handled by sendWhatsAppText
// (called from other functions like mpesa-callback when WHATSAPP_TOKEN is set).
//
// Required runtime secrets (added separately once the user enables WhatsApp):
//   WHATSAPP_VERIFY_TOKEN   — arbitrary string shared with Meta's webhook config
//   WHATSAPP_TOKEN          — permanent access token from Meta App
//   WHATSAPP_PHONE_ID       — phone-number ID from WhatsApp Business
//
// If WHATSAPP_TOKEN is unset, the function still verifies and ack's incoming
// messages but performs no outbound calls. That keeps deploys safe pre-config.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, clientIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

export async function sendWhatsAppText(toPhone: string, body: string): Promise<void> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
  if (!token || !phoneId) {
    console.log("WhatsApp not configured — skipping outbound message");
    return;
  }
  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "text",
      text: { body: body.slice(0, 4096) },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("WhatsApp send failed", res.status, text);
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- GET: webhook verification ---
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (mode === "subscribe" && expected && token === expected && challenge) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Per-IP rate limit: 200 events / minute (Meta can burst on delivery receipts).
    const rl = await enforceRateLimit(service, `wa:ip:${clientIp(req)}`, 60, 200);
    if (!rl.allowed) {
      return new Response("Too many requests", { status: 429 });
    }

    const body = await req.json();
    const change = body?.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    // Status / delivery receipts — just ack.
    if (!message) return new Response("OK", { status: 200 });

    const from: string = message.from;
    const text: string = (message.text?.body ?? "").toLowerCase().trim();

    if (!text) {
      await sendWhatsAppText(from, "Send 'menu' to see what I can help with.");
      return new Response("OK", { status: 200 });
    }

    if (["hi", "hello", "menu", "start"].includes(text)) {
      await sendWhatsAppText(
        from,
        "🌿 Habari! Karibu Captain Compost.\n\n" +
          "Reply with:\n" +
          "• ORDER <number> — track an order\n" +
          "• USSD — order from any phone (*384*555#)\n" +
          "• SHOP — link to the store\n" +
          "• CALL — talk to our team",
      );
    } else if (text.startsWith("order ")) {
      const ref = text.replace("order ", "").trim().toUpperCase();
      const { data: order } = await service
        .from("orders")
        .select("id, status, total_amount")
        .ilike("id", `${ref.toLowerCase()}%`)
        .limit(1)
        .maybeSingle();
      if (order) {
        await sendWhatsAppText(
          from,
          `Order #${order.id.slice(0, 8).toUpperCase()}\nStatus: ${order.status}\nTotal: KES ${Math.ceil(order.total_amount).toLocaleString()}`,
        );
      } else {
        await sendWhatsAppText(from, `Order '${ref}' not found. Check the 8-character reference and try again.`);
      }
    } else if (text === "ussd") {
      await sendWhatsAppText(from, "Dial *384*555# from any phone to order without internet.");
    } else if (text === "shop") {
      await sendWhatsAppText(from, "Browse all products: https://compost-fusion-hub.lovable.app/products");
    } else if (text === "call") {
      await sendWhatsAppText(from, "Call us on +254 700 116 655 — Mon–Sat, 8am–6pm EAT.");
    } else {
      await sendWhatsAppText(from, "I didn't catch that. Reply 'menu' for options.");
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("whatsapp-webhook error:", e);
    return new Response("OK", { status: 200 }); // always 200 so Meta doesn't retry-storm
  }
});
