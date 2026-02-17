import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, Award } from "lucide-react";

export default function RewardsCard() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["rewards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rewards").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Trophy className="h-4 w-4 text-secondary" /> Rewards
            </div>
            <div className="mt-2 font-display text-3xl font-bold text-foreground">{data?.points ?? 0} <span className="text-base font-normal text-muted-foreground">points</span></div>
            <div className="mt-1 flex items-center gap-1 text-sm capitalize text-primary">
              <Star className="h-4 w-4" /> {data?.level ?? "beginner"} level
            </div>
          </div>
          {data?.badges && data.badges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.badges.map((b: string) => (
                <span key={b} className="flex items-center gap-1 rounded-full bg-secondary/20 px-2 py-1 text-xs font-medium">
                  <Award className="h-3 w-3" />{b}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
