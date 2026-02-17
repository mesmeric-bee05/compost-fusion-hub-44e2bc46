import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function UserOrders() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const formatPrice = (p: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(p);
  const statusColor: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800", shipped: "bg-purple-100 text-purple-800", delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!orders?.length) return <p className="py-8 text-center text-muted-foreground">No orders yet.</p>;

  return (
    <div className="space-y-3">
      {orders.map(o => (
        <Card key={o.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">#{o.id.slice(0, 8)}</span>
                <Badge className={statusColor[o.status]}>{o.status}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
            </div>
            <div className="font-display font-bold">{formatPrice(o.total_amount)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
