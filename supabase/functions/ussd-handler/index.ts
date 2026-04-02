import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const text = (formData.get("text") as string) || "";

    if (!sessionId || !phoneNumber) {
      return new Response("END Invalid request", { headers: corsHeaders });
    }

    const inputs = text.split("*").filter(Boolean);
    let response = "";

    if (inputs.length === 0) {
      // Main menu
      response = `CON Welcome to Captain Compost 🌿
1. Shop Products
2. My Eco-Points
3. Track Order
4. Compost Tips
5. Contact Support`;
    } else if (inputs[0] === "1") {
      // Shop Products
      if (inputs.length === 1) {
        const { data: products } = await supabase
          .from("products")
          .select("id, name, price, currency, category")
          .eq("is_active", true)
          .gt("stock_quantity", 0)
          .order("price", { ascending: true })
          .limit(5);

        if (products && products.length > 0) {
          response = "CON Select a product:\n" +
            products.map((p, i) => `${i + 1}. ${p.name} - ${p.currency} ${Number(p.price).toLocaleString()}`).join("\n");

          // Store products in session
          await supabase.from("ussd_sessions").upsert({
            session_id: sessionId,
            phone_number: phoneNumber,
            menu_state: "SHOP_LIST",
            session_data: { products: products.map(p => p.id) },
          }, { onConflict: "session_id" });
        } else {
          response = "END No products available at the moment. Please check back later.";
        }
      } else if (inputs.length === 2) {
        // Product selected
        const { data: session } = await supabase
          .from("ussd_sessions")
          .select("session_data")
          .eq("session_id", sessionId)
          .single();

        const productIds = (session?.session_data as any)?.products || [];
        const selectedIndex = parseInt(inputs[1]) - 1;

        if (selectedIndex >= 0 && selectedIndex < productIds.length) {
          const { data: product } = await supabase
            .from("products")
            .select("*")
            .eq("id", productIds[selectedIndex])
            .single();

          if (product) {
            await supabase.from("ussd_sessions").update({
              menu_state: "PRODUCT_DETAIL",
              session_data: { product_id: product.id, price: product.price },
            }).eq("session_id", sessionId);

            response = `CON ${product.name}
Price: ${product.currency} ${Number(product.price).toLocaleString()}
${product.short_description || ""}

1. Buy Now (M-Pesa)
0. Back to Menu`;
          } else {
            response = "END Product not found. Please try again.";
          }
        } else {
          response = "END Invalid selection. Please try again.";
        }
      } else if (inputs.length === 3 && inputs[2] === "1") {
        // Buy now - trigger M-Pesa
        const { data: session } = await supabase
          .from("ussd_sessions")
          .select("session_data")
          .eq("session_id", sessionId)
          .single();

        const productId = (session?.session_data as any)?.product_id;
        const price = (session?.session_data as any)?.price;

        if (productId && price) {
          response = `END Order placed! 
An M-Pesa prompt for KES ${Number(price).toLocaleString()} will be sent to ${phoneNumber}.
Enter your PIN to complete payment.
Thank you for choosing Captain Compost! 🌿`;

          // Trigger M-Pesa payment via the existing function
          const mpesaUrl = `${supabaseUrl}/functions/v1/initiate-mpesa-payment`;
          fetch(mpesaUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              phone: phoneNumber.replace("+", ""),
              amount: Math.ceil(price),
              orderId: "ussd-" + sessionId,
            }),
          }).catch(console.error);
        } else {
          response = "END Error processing order. Please try again.";
        }
      } else {
        response = "END Invalid selection.";
      }
    } else if (inputs[0] === "2") {
      // My Eco-Points
      const cleanPhone = phoneNumber.replace("+", "").replace(/^254/, "0");
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("phone", cleanPhone)
        .single();

      if (profile) {
        const { data: rewards } = await supabase
          .from("rewards")
          .select("points, level")
          .eq("user_id", profile.user_id)
          .single();

        response = rewards
          ? `END 🌟 Your Eco-Points
Points: ${rewards.points}
Level: ${rewards.level.charAt(0).toUpperCase() + rewards.level.slice(1)}
Keep recycling to earn more!`
          : "END No rewards found. Start composting to earn points!";
      } else {
        response = "END Phone number not registered. Sign up at captaincompost.co.ke to start earning eco-points!";
      }
    } else if (inputs[0] === "3") {
      // Track Order
      if (inputs.length === 1) {
        response = "CON Enter your Order ID:";
      } else {
        const orderId = inputs[1];
        const { data: order } = await supabase
          .from("orders")
          .select("id, status, total_amount, created_at")
          .eq("id", orderId)
          .single();

        response = order
          ? `END Order: ${order.id.slice(0, 8)}...
Status: ${order.status.toUpperCase()}
Amount: KES ${Number(order.total_amount).toLocaleString()}
Placed: ${new Date(order.created_at).toLocaleDateString()}`
          : "END Order not found. Please check your order ID and try again.";
      }
    } else if (inputs[0] === "4") {
      // Compost Tips
      const tip = COMPOST_TIPS[Math.floor(Math.random() * COMPOST_TIPS.length)];
      response = `END 🌱 ${tip}\n\nDial *384*555# for more tips!`;
    } else if (inputs[0] === "5") {
      // Contact Support
      response = `END 📞 Captain Compost Support
WhatsApp: +254 700 000 000
Email: info@captaincompost.co.ke
Web: captaincompost.co.ke
Hours: Mon-Sat 8am-6pm`;
    } else {
      response = "END Invalid option. Dial *384*555# to try again.";
    }

    // Clean up session if END
    if (response.startsWith("END")) {
      await supabase.from("ussd_sessions").update({ is_active: false }).eq("session_id", sessionId);
    }

    return new Response(response, { headers: corsHeaders });
  } catch (error) {
    console.error("USSD handler error:", error);
    return new Response("END An error occurred. Please try again later.", { headers: corsHeaders });
  }
});
