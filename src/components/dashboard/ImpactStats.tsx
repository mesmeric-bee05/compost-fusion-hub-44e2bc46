import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, Wind, TreePine, Recycle } from "lucide-react";

export default function ImpactStats() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["impact", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("impact_metrics").select("*").eq("user_id", user!.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const stats = [
    { icon: Recycle, label: "Waste Diverted", value: `${data?.waste_diverted_kg ?? 0} kg`, color: "text-primary" },
    { icon: Wind, label: "CO₂ Saved", value: `${data?.co2_saved_kg ?? 0} kg`, color: "text-blue-500" },
    { icon: Leaf, label: "Compost Produced", value: `${data?.compost_produced_kg ?? 0} kg`, color: "text-green-600" },
    { icon: TreePine, label: "Trees Equivalent", value: `${data?.trees_equivalent ?? 0}`, color: "text-emerald-700" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(s => (
        <Card key={s.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <s.icon className={`h-8 w-8 ${s.color}`} />
            <div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="font-display text-xl font-bold">{s.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
