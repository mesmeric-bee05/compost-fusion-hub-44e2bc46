import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths, startOfMonth } from "date-fns";

export default function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-revenue-chart"],
    queryFn: async () => {
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5)).toISOString();
      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, total_amount")
        .gte("created_at", sixMonthsAgo)
        .order("created_at");

      const monthMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const key = format(subMonths(new Date(), i), "MMM yyyy");
        monthMap[key] = 0;
      }
      orders?.forEach((o) => {
        const key = format(new Date(o.created_at), "MMM yyyy");
        if (key in monthMap) monthMap[key] += Number(o.total_amount);
      });
      return Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
