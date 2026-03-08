import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BadgesProgress from "@/components/gamification/BadgesProgress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Crown, Award, Star, Loader2 } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  points: number;
  level: string;
  badge_count: number;
}

export default function Leaderboard() {
  const { user } = useAuth();

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      // Get top users by points
      const { data: rewards, error } = await supabase
        .from("rewards")
        .select("user_id, points, level")
        .order("points", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Get profiles for names
      const userIds = rewards.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Get badge counts
      const { data: badges } = await supabase
        .from("user_badges")
        .select("user_id")
        .in("user_id", userIds);

      const badgeCounts: Record<string, number> = {};
      badges?.forEach((b) => {
        badgeCounts[b.user_id] = (badgeCounts[b.user_id] || 0) + 1;
      });

      const profileMap: Record<string, string> = {};
      profiles?.forEach((p) => {
        profileMap[p.user_id] = p.full_name || "Anonymous";
      });

      return rewards.map((r) => ({
        user_id: r.user_id,
        full_name: profileMap[r.user_id] || "Anonymous",
        points: r.points,
        level: r.level,
        badge_count: badgeCounts[r.user_id] || 0,
      })) as LeaderboardEntry[];
    },
  });

  const rankIcons = [Crown, Medal, Award];
  const rankColors = [
    "text-yellow-500",
    "text-gray-400",
    "text-amber-600",
  ];

  const myRank = leaderboard.findIndex((e) => e.user_id === user?.id) + 1;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Achievements & Leaderboard</h1>
          <p className="mt-2 text-muted-foreground">
            Track your progress, earn badges, and see how you compare with the community.
          </p>
        </div>

        <Tabs defaultValue="leaderboard" className="mx-auto max-w-3xl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Leaderboard
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Star className="h-4 w-4" /> My Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="mt-6">
            {myRank > 0 && (
              <Card className="mb-4 border-primary/30 bg-primary/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      #{myRank}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Your Rank</p>
                      <p className="text-sm text-muted-foreground">Keep composting to climb higher!</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-primary">
                      {leaderboard[myRank - 1]?.points || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => {
                  const isMe = entry.user_id === user?.id;
                  const RankIcon = i < 3 ? rankIcons[i] : null;
                  const rankColor = i < 3 ? rankColors[i] : "";

                  return (
                    <Card
                      key={entry.user_id}
                      className={`transition-all ${isMe ? "border-primary/30 bg-primary/5" : ""}`}
                    >
                      <CardContent className="flex items-center gap-4 p-3 sm:p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                          {RankIcon ? (
                            <RankIcon className={`h-6 w-6 ${rankColor}`} />
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                              {entry.full_name}
                              {isMe && " (You)"}
                            </p>
                            <Badge variant="outline" className="shrink-0 capitalize text-[10px]">
                              {entry.level}
                            </Badge>
                          </div>
                          {entry.badge_count > 0 && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Award className="h-3 w-3" /> {entry.badge_count} badge{entry.badge_count > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-bold text-foreground">{entry.points.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">points</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {leaderboard.length === 0 && (
                  <div className="flex flex-col items-center py-12">
                    <Trophy className="h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-3 text-muted-foreground">No participants yet. Be the first!</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="badges" className="mt-6">
            <BadgesProgress />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
