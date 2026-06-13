import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { enforceRateLimit, clientIp } from "../_shared/rate-limit.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "text/plain",
};

const COMPOST_TIPS = [
  "Tip: Turn your compost every 1-2 weeks for faster decomposition!",
  "Tip: Your compost should feel like a wrung-out sponge — moist but not soggy.",
  "Tip: Add crushed eggshells to your compost for calcium-rich soil!",
  "Tip: Coffee grounds are excellent green material for composting.",
  "Tip: Shredded cardboard makes great brown material for your compost bin.",
];

export const normalizePhone = (raw: string): string => {
  let p = (raw || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  return p;
};

type CartItem = { product_id: string; qty: number; unit_price: number; name: string };
type Transition = { from: string; to: string; at: string; input?: string };
type SessionData = {
  products?: string[];
  product_id?: string;
  cart?: CartItem[];
  transitions?: Transition[];
};

async function recordTransition(
  db: ReturnType<typeof createClient>,
  sessionId: string,
  prev: SessionData | null,
  prevState: string | null,
  nextState: string,
  input?: string,
) {
  const transitions = (prev?.transitions ?? []).slice(-49);
  transitions.push({
    from: prevState ?? "·",
    to: nextState,
    at: new Date().toISOString(),
    input,
  });
  return transitions;
}

export async function handleUssd(input: {
  sessionId: string;
  phoneNumber: string;
  text: string;
  client?: ReturnType<typeof createClient>;
}): Promise<string> {
  const { sessionId, phoneNumber } = input;
  const text = input.text || "";
  const db = input.client ?? supabase;

  if (!sessionId || !phoneNumber) {
    return "END Invalid request";
  }
  const inputs = text.split("*").filter(Boolean);
  const msisdn = normalizePhone(phoneNumber);

  // Main menu
  if (inputs.length === 0) {
    return `CON Welcome to Captain Compost 🌿
1. Shop Products
2. My Eco-Points
3. Track Order
4. Compost Tips
5. Contact Support
6. View Cart`;
  }

  // ── 1. Shop Products ──
  if (inputs[0] === "1") {
    if (inputs.length === 1) {
      const { data: products } = await db
        .from("products")
        .select("id, name, price, currency")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("price", { ascending: true })
        .limit(5);
      if (!products?.length) return "END No products available. Check back soon.";
      const { data: prevSession } = await db
        .from("ussd_sessions")
        .select("menu_state, session_data")
        .eq("session_id", sessionId)
        .maybeSingle();
      const prevSd = (prevSession?.session_data as SessionData) ?? {};
      const transitions = await recordTransition(
        db, sessionId, prevSd, prevSession?.menu_state ?? "MAIN", "SHOP_LIST", text,
      );
      await db.from("ussd_sessions").upsert(
        {
          session_id: sessionId,
          phone_number: msisdn,
          menu_state: "SHOP_LIST",
          session_data: { ...prevSd, products: products.map((p) => p.id), transitions },
        },
        { onConflict: "session_id" },
      );
      return (
        "CON Select a product:\n" +
        products
          .map((p, i) => `${i + 1}. ${p.name} - ${p.currency} ${Number(p.price).toLocaleString()}`)
          .join("\n")
      );
    }

    if (inputs.length === 2) {
      const { data: session } = await db
        .from("ussd_sessions")
        .select("session_data, menu_state")
        .eq("session_id", sessionId)
        .single();
      const productIds = ((session?.session_data as SessionData) ?? {}).products ?? [];
      const idx = parseInt(inputs[1]) - 1;
      if (idx < 0 || idx >= productIds.length) return "END Invalid selection.";
      const { data: product } = await db
        .from("products")
        .select("*")
        .eq("id", productIds[idx])
        .single();
      if (!product) return "END Product not found.";

      const prevSd = (session?.session_data as SessionData) ?? {};
      const transitions = await recordTransition(
        db, sessionId, prevSd, session?.menu_state ?? "SHOP_LIST", "PRODUCT_DETAIL", text,
      );
      const sd: SessionData = {
        products: productIds,
        product_id: product.id,
        cart: prevSd.cart ?? [],
        transitions,
      };
      await db
        .from("ussd_sessions")
        .update({ menu_state: "PRODUCT_DETAIL", session_data: sd })
        .eq("session_id", sessionId);

      return `CON ${product.name}
${product.currency} ${Number(product.price).toLocaleString()}
${product.short_description ?? ""}
1. Add to cart (qty)
2. Buy now (qty)
0. Back`;
    }

    if (inputs.length === 3 && (inputs[2] === "1" || inputs[2] === "2")) {
      return "CON Enter quantity (1-99):";
    }

    if (inputs.length === 4 && (inputs[2] === "1" || inputs[2] === "2")) {
      const qty = Math.max(1, Math.min(99, parseInt(inputs[3]) || 1));
      const { data: session } = await db
        .from("ussd_sessions")
        .select("session_data")
        .eq("session_id", sessionId)
        .single();
      const sd: SessionData = (session?.session_data as SessionData) ?? {};
      if (!sd.product_id) return "END Session expired.";
      const { data: product } = await db
        .from("products")
        .select("id, name, price, currency, stock_quantity")
        .eq("id", sd.product_id)
        .single();
      if (!product) return "END Product not found.";
      const useQty = Math.min(qty, product.stock_quantity);
      const item: CartItem = {
        product_id: product.id,
        qty: useQty,
        unit_price: Number(product.price),
        name: product.name,
      };
      const cart = [...(sd.cart ?? []).filter((c) => c.product_id !== item.product_id), item];

      if (inputs[2] === "1") {
        await db
          .from("ussd_sessions")
          .update({ menu_state: "CART", session_data: { ...sd, cart } })
          .eq("session_id", sessionId);
        const subtotal = cart.reduce((s, c) => s + c.qty * c.unit_price, 0);
        return `END Added ${useQty} x ${product.name} to cart.
Cart: ${cart.length} item(s) • KES ${subtotal.toLocaleString()}
Dial *384*555# and choose 6 to checkout.`;
      }

      // Buy now → create order + initiate M-Pesa
      return await createOrderAndPay(db, msisdn, sessionId, [item]);
    }
  }

  // ── 2. Eco-Points ──
  if (inputs[0] === "2") {
    const phoneVariants = [msisdn, "+" + msisdn, "0" + msisdn.slice(3)];
    const { data: profile } = await db
      .from("profiles")
      .select("user_id")
      .in("phone", phoneVariants)
      .maybeSingle();
    if (!profile) {
      return "END Phone not registered. Sign up at captaincompost.co.ke to start earning eco-points!";
    }
    const { data: rewards } = await db
      .from("rewards")
      .select("points, level")
      .eq("user_id", profile.user_id)
      .single();
    if (!rewards) return "END No rewards yet. Start composting to earn points!";
    return `END 🌟 Your Eco-Points
Points: ${rewards.points}
Level: ${rewards.level.charAt(0).toUpperCase() + rewards.level.slice(1)}
Keep recycling to earn more!`;
  }

  // ── 3. Track Order ──
  if (inputs[0] === "3") {
    if (inputs.length === 1) return "CON Enter your Order ID (first 8 chars OK):";
    const oid = inputs[1].trim().toLowerCase();
    if (oid.length < 6) return "END Order ID too short.";
    // Match by prefix on UUID
    const { data: order } = await db
      .from("orders")
      .select("id, status, total_amount, created_at")
      .ilike("id::text", `${oid}%`)
      .limit(1)
      .maybeSingle();
    if (!order) return "END Order not found. Check your ID and try again.";
    return `END Order: ${order.id.slice(0, 8)}…
Status: ${order.status.toUpperCase()}
Amount: KES ${Number(order.total_amount).toLocaleString()}
Placed: ${new Date(order.created_at).toLocaleDateString()}`;
  }

  // ── 4. Tips ──
  if (inputs[0] === "4") {
    const tip = COMPOST_TIPS[Math.floor(Math.random() * COMPOST_TIPS.length)];
    return `END 🌱 ${tip}\n\nDial *384*555# for more tips!`;
  }

  // ── 5. Support ──
  if (inputs[0] === "5") {
    return `END 📞 Captain Compost Support
Phone/WhatsApp: +254 700 116 655
Email: info@captaincompost.co.ke
Web: captaincompost.co.ke
Hours: Mon-Sat 8am-6pm`;
  }

  // ── 6. View Cart / Checkout ──
  if (inputs[0] === "6") {
    const { data: session } = await db
      .from("ussd_sessions")
      .select("session_data")
      .eq("session_id", sessionId)
      .single();
    const cart = ((session?.session_data as SessionData)?.cart) ?? [];
    if (!cart.length) return "END Your cart is empty.";
    if (inputs.length === 1) {
      const subtotal = cart.reduce((s, c) => s + c.qty * c.unit_price, 0);
      return `CON Cart (${cart.length}):
${cart.map((c, i) => `${i + 1}. ${c.qty}x ${c.name} = ${(c.qty * c.unit_price).toLocaleString()}`).join("\n")}
Total: KES ${subtotal.toLocaleString()}
1. Checkout (M-Pesa)
2. Clear cart`;
    }
    if (inputs[1] === "1") {
      return await createOrderAndPay(db, msisdn, sessionId, cart);
    }
    if (inputs[1] === "2") {
      await db
        .from("ussd_sessions")
        .update({ session_data: {} })
        .eq("session_id", sessionId);
      return "END Cart cleared.";
    }
  }

  return "END Invalid option. Dial *384*555# to try again.";
}

async function createOrderAndPay(
  db: ReturnType<typeof createClient>,
  msisdn: string,
  sessionId: string,
  cart: CartItem[],
): Promise<string> {
  const total = cart.reduce((s, c) => s + c.qty * c.unit_price, 0);
  if (total <= 0) return "END Cart is empty.";

  // Resolve user_id by phone (best-effort)
  const phoneVariants = [msisdn, "+" + msisdn, "0" + msisdn.slice(3)];
  const { data: profile } = await db
    .from("profiles")
    .select("user_id")
    .in("phone", phoneVariants)
    .maybeSingle();

  if (!profile) {
    return `END To checkout via USSD, please sign up at captaincompost.co.ke and add your phone (${msisdn}) to your profile.`;
  }

  // Create order
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      user_id: profile.user_id,
      total_amount: total,
      status: "pending",
      delivery_phone: msisdn,
      notes: `USSD order via session ${sessionId}`,
    })
    .select("id")
    .single();
  if (orderErr || !order) return "END Could not create order. Try again.";

  // Order items
  const items = cart.map((c) => ({
    order_id: order.id,
    product_id: c.product_id,
    quantity: c.qty,
    unit_price: c.unit_price,
    total_price: c.qty * c.unit_price,
  }));
  await db.from("order_items").insert(items);

  // Trigger M-Pesa
  fetch(`${supabaseUrl}/functions/v1/initiate-mpesa-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      phone: msisdn,
      amount: Math.ceil(total),
      orderId: order.id,
    }),
  }).catch(console.error);

  // Clear cart
  await db.from("ussd_sessions").update({ session_data: {} }).eq("session_id", sessionId);

  return `END Order ${order.id.slice(0, 8)} placed!
KES ${total.toLocaleString()} M-Pesa prompt sent to ${msisdn}.
Enter your PIN to pay.
Track at captaincompost.co.ke 🌿`;
}

// Africa's Talking webhook authentication.
// When AT_CALLBACK_SECRET is configured we require requests to present it.
// AT supports a shared secret via custom header (set in the AT dashboard).
function ussdRequestAuthorized(req: Request): boolean {
  const expected = Deno.env.get("AT_CALLBACK_SECRET");
  if (!expected) {
    // Secret not configured — reject all requests to fail-closed.
    return false;
  }
  const url = new URL(req.url);
  const provided =
    req.headers.get("x-at-secret") ??
    req.headers.get("x-callback-secret") ??
    url.searchParams.get("secret") ??
    "";
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!ussdRequestAuthorized(req)) {
      console.warn("USSD request rejected: missing/invalid AT_CALLBACK_SECRET");
      return new Response("END Unauthorized", { status: 401, headers: corsHeaders });
    }

    // Per-IP rate limit: USSD is high-frequency but a single phone session is
    // bounded by AT's 120s timeout — 200 hits/min protects against abuse from
    // forged callbacks that pass the shared-secret check.
    const rl = await enforceRateLimit(supabase, `ussd:ip:${clientIp(req)}`, 60, 200);
    if (!rl.allowed) {
      return new Response("END Service busy. Try again shortly.", { status: 429, headers: corsHeaders });
    }

    const formData = await req.formData();

    const sessionId = formData.get("sessionId") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const text = (formData.get("text") as string) || "";

    const response = await handleUssd({ sessionId, phoneNumber, text });

    if (response.startsWith("END") && sessionId) {
      await supabase.from("ussd_sessions").update({ is_active: false }).eq("session_id", sessionId);
    }
    return new Response(response, { headers: corsHeaders });
  } catch (e) {
    console.error("USSD handler error:", e);
    return new Response("END An error occurred. Please try again.", { headers: corsHeaders });
  }
});

