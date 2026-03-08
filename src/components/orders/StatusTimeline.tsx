import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Package, CreditCard, Truck, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusEntry {
  id: string;
  order_id: string;
  status: string;
  note: string | null;
  created_at: string;
}

const statusIcons: Record<string, typeof Package> = {
  pending: Clock,
  confirmed: CreditCard,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

const statusColors: Record<string, string> = {
  pending: "border-muted-foreground bg-muted text-muted-foreground",
  confirmed: "border-primary bg-primary/10 text-primary",
  shipped: "border-primary bg-primary/10 text-primary",
  delivered: "border-green-500 bg-green-500/10 text-green-600",
  cancelled: "border-destructive bg-destructive/10 text-destructive",
};

export default function StatusTimeline({ orderId }: { orderId: string }) {
  const { data: history = [] } = useQuery({
    queryKey: ["order-status-history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StatusEntry[];
    },
    enabled: !!orderId,
  });

  if (history.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Status Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {history.map((entry, i) => {
            const Icon = statusIcons[entry.status] || Clock;
            const colors = statusColors[entry.status] || statusColors.pending;
            const isLast = i === history.length - 1;
            const date = new Date(entry.created_at);

            return (
              <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Vertical line */}
                {!isLast && (
                  <div className="absolute left-[19px] top-10 h-[calc(100%-24px)] w-0.5 bg-border" />
                )}
                {/* Icon circle */}
                <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${colors}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {/* Content */}
                <div className="flex-1 pt-1">
                  <p className={`text-sm font-medium capitalize ${isLast ? "text-foreground" : "text-muted-foreground"}`}>
                    {entry.status}
                  </p>
                  {entry.note && (
                    <p className="text-xs text-muted-foreground">{entry.note}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {date.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    {date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
