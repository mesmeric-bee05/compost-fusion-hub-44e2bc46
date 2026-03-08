import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Award, Trophy, Shield, Truck, ShoppingBag, Heart, Leaf,
  Recycle, Cloud, MessageCircle, Star, Lock, CheckCircle,
} from "lucide-react";

const iconMap: Record<string, typeof Award> = {
  award: Award, trophy: Trophy, shield: Shield, truck: Truck,
  "shopping-bag": ShoppingBag, heart: Heart, leaf: Leaf,
  recycle: Recycle, cloud: Cloud, "message-circle": MessageCircle, star: Star,
};

interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
}

interface UserBadge {
  badge_id: string;
  earned_at: string;
}

export default function BadgesProgress() {
  const { user } = useAuth();

  const { data: allBadges = [] } = useQuery({
    queryKey: ["badge-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badge_definitions").select("*").order("requirement_value");
      if (error) throw error;
      return data as BadgeDef[];
    },
  });

  const { data: earnedBadges = [] } = useQuery({
    queryKey: ["user-badges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user!.id);
      if (error) throw error;
      return data as UserBadge[];
    },
    enabled: !!user,
  });

  const { data: userStats } = useQuery({
    queryKey: ["user-gamification-stats", user?.id],
    queryFn: async () => {
      const [collectionsRes, ordersRes, metricsRes, postsRes, reviewsRes] = await Promise.all([
        supabase.from("collection_requests").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("impact_metrics").select("waste_diverted_kg, co2_saved_kg").eq("user_id", user!.id),
        supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);

      const metrics = metricsRes.data || [];
      const totalWaste = metrics.reduce((sum, m) => sum + Number(m.waste_diverted_kg), 0);
      const totalCo2 = metrics.reduce((sum, m) => sum + Number(m.co2_saved_kg), 0);

      return {
        collections_count: collectionsRes.count || 0,
        orders_count: ordersRes.count || 0,
        waste_diverted_kg: totalWaste,
        co2_saved_kg: totalCo2,
        forum_posts_count: postsRes.count || 0,
        reviews_count: reviewsRes.count || 0,
      };
    },
    enabled: !!user,
  });

  const earnedSet = new Set(earnedBadges.map((b) => b.badge_id));

  const getProgress = (badge: BadgeDef): number => {
    if (!userStats) return 0;
    const current = (userStats as any)[badge.requirement_type] || 0;
    return Math.min((current / badge.requirement_value) * 100, 100);
  };

  const categories = [...new Set(allBadges.map((b) => b.category))];

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const badges = allBadges.filter((b) => b.category === cat);
        return (
          <div key={cat}>
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground capitalize">{cat}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge) => {
                const earned = earnedSet.has(badge.id);
                const progress = getProgress(badge);
                const Icon = iconMap[badge.icon] || Award;

                return (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <Card className={`transition-all ${earned ? "border-primary/30 bg-primary/5" : "opacity-70"}`}>
                        <CardContent className="flex items-center gap-3 p-4">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${earned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {earned ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${earned ? "text-foreground" : "text-muted-foreground"}`}>{badge.name}</p>
                              {earned && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                            </div>
                            <p className="text-xs text-muted-foreground">{badge.description}</p>
                            {!earned && (
                              <Progress value={progress} className="mt-2 h-1.5" />
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">+{badge.points_reward}pts</Badge>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      {earned ? "Earned!" : `${Math.round(progress)}% complete`}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
