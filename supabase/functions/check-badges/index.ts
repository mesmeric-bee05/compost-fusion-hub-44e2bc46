import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Use service role for cross-table reads and writes
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get all badge definitions
    const { data: badges, error: badgesError } = await serviceClient
      .from("badge_definitions")
      .select("*");
    if (badgesError) throw badgesError;

    // 2. Get already earned badges
    const { data: earned } = await serviceClient
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId);
    const earnedSet = new Set((earned || []).map((e: { badge_id: string }) => e.badge_id));

    // 3. Gather user stats
    const [collectionsRes, ordersRes, metricsRes, postsRes, reviewsRes] = await Promise.all([
      serviceClient.from("collection_requests").select("id", { count: "exact", head: true }).eq("user_id", userId),
      serviceClient.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "cancelled"),
      serviceClient.from("impact_metrics").select("waste_diverted_kg, co2_saved_kg").eq("user_id", userId),
      serviceClient.from("forum_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      serviceClient.from("product_reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const metrics = metricsRes.data || [];
    const stats: Record<string, number> = {
      collections_count: collectionsRes.count || 0,
      orders_count: ordersRes.count || 0,
      waste_diverted_kg: metrics.reduce((s, m) => s + Number(m.waste_diverted_kg), 0),
      co2_saved_kg: metrics.reduce((s, m) => s + Number(m.co2_saved_kg), 0),
      forum_posts_count: postsRes.count || 0,
      reviews_count: reviewsRes.count || 0,
    };

    // 4. Check each badge and award if requirements met
    const newlyAwarded: string[] = [];
    let pointsEarned = 0;

    for (const badge of badges || []) {
      if (earnedSet.has(badge.id)) continue;

      const currentValue = stats[badge.requirement_type] || 0;
      if (currentValue >= badge.requirement_value) {
        // Award badge
        const { error: insertError } = await serviceClient
          .from("user_badges")
          .insert({ user_id: userId, badge_id: badge.id });

        if (!insertError) {
          newlyAwarded.push(badge.name);
          pointsEarned += badge.points_reward;
        }
      }
    }

    // 5. Add bonus points to rewards if any badges earned
    if (pointsEarned > 0) {
      const { data: currentRewards } = await serviceClient
        .from("rewards")
        .select("points, level, badges")
        .eq("user_id", userId)
        .single();

      if (currentRewards) {
        const newPoints = currentRewards.points + pointsEarned;
        const existingBadges: string[] = currentRewards.badges || [];
        const allBadges = [...new Set([...existingBadges, ...newlyAwarded])];

        // Calculate level based on points
        let newLevel = "beginner";
        if (newPoints >= 500) newLevel = "champion";
        else if (newPoints >= 200) newLevel = "expert";
        else if (newPoints >= 50) newLevel = "intermediate";

        await serviceClient
          .from("rewards")
          .update({ points: newPoints, level: newLevel, badges: allBadges })
          .eq("user_id", userId);
      }

      // Create notification for each new badge
      for (const badgeName of newlyAwarded) {
        await serviceClient.from("notifications").insert({
          user_id: userId,
          type: "reward_achievement",
          title: `Badge Earned: ${badgeName}! 🏆`,
          message: `Congratulations! You've earned the "${badgeName}" badge and ${pointsEarned} bonus points.`,
          link: "/leaderboard",
        });
      }
    }

    return new Response(
      JSON.stringify({
        awarded: newlyAwarded,
        points_earned: pointsEarned,
        stats,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("check-badges error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
