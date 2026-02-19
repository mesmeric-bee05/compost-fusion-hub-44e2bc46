import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, Recycle, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const formatKES = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

export default function AdminStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profiles, orders, collections] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total_amount"),
        supabase.from("collection_requests").select("id, status"),
      ]);
      const totalUsers = profiles.count ?? 0;
      const totalOrders = orders.data?.length ?? 0;
      const totalRevenue = orders.data?.reduce((s, o) => s + Number(o.total_amount), 0) ?? 0;
      const totalCollections = collections.data?.length ?? 0;
      return { totalUsers, totalOrders, totalRevenue, totalCollections };
    },
  });

  const cards = [
    { title: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, fmt: (v: number) => v.toString() },
    { title: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingCart, fmt: (v: number) => v.toString() },
    { title: "Revenue", value: stats?.totalRevenue ?? 0, icon: DollarSign, fmt: formatKES },
    { title: "Collections", value: stats?.totalCollections ?? 0, icon: Recycle, fmt: (v: number) => v.toString() },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">{c.fmt(c.value)}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
