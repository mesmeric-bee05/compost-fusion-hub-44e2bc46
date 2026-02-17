import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Calendar } from "lucide-react";

const statusColors: Record<string, string> = {
  requested: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  collected: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function CollectionTracker() {
  const { user } = useAuth();

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!collections?.length) return <p className="py-8 text-center text-muted-foreground">No collection requests yet.</p>;

  return (
    <div className="space-y-3">
      {collections.map(c => (
        <Card key={c.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium capitalize">{c.waste_type}</span>
                <Badge className={statusColors[c.status]}>{c.status}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.address}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(c.pickup_date).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium">{c.estimated_volume_kg} kg</div>
              <div className="text-xs text-muted-foreground capitalize">{c.frequency.replace("_", " ")}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
