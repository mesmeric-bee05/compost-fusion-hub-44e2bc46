import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subMonths, startOfMonth, subDays } from "date-fns";
import { TrendingUp, Package, Users, MapPin } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--eco-sky))",
  "hsl(var(--eco-earth))",
  "hsl(var(--eco-leaf))",
  "hsl(var(--destructive))",
];

export default function AnalyticsDashboard() {
  // Sales trends (daily for last 30 days)
  const { data: salesTrends, isLoading: salesLoading } = useQuery({
    queryKey: ["analytics-sales-trends"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, total_amount, status")
        .gte("created_at", thirtyDaysAgo)
        .neq("status", "cancelled")
        .order("created_at");

      const dayMap: Record<string, { revenue: number; orders: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const key = format(subDays(new Date(), i), "MMM d");
        dayMap[key] = { revenue: 0, orders: 0 };
      }
      orders?.forEach((o) => {
        const key = format(new Date(o.created_at), "MMM d");
        if (key in dayMap) {
          dayMap[key].revenue += Number(o.total_amount);
          dayMap[key].orders += 1;
        }
      });
      return Object.entries(dayMap).map(([day, data]) => ({ day, ...data }));
    },
  });

  // Popular products
  const { data: popularProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["analytics-popular-products"],
    queryFn: async () => {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity, products(name)");

      const productMap: Record<string, { name: string; totalQty: number; totalOrders: number }> = {};
      items?.forEach((item) => {
        const pid = item.product_id;
        const name = (item.products as any)?.name || "Unknown";
        if (!productMap[pid]) productMap[pid] = { name, totalQty: 0, totalOrders: 0 };
        productMap[pid].totalQty += item.quantity;
        productMap[pid].totalOrders += 1;
      });

      return Object.values(productMap)
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 6);
    },
  });

  // Customer retention: new vs returning per month
  const { data: retention, isLoading: retentionLoading } = useQuery({
    queryKey: ["analytics-retention"],
    queryFn: async () => {
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5)).toISOString();
      const { data: orders } = await supabase
        .from("orders")
        .select("user_id, created_at")
        .gte("created_at", sixMonthsAgo)
        .order("created_at");

      const months: Record<string, { newUsers: Set<string>; returningUsers: Set<string> }> = {};
      const seenUsers = new Set<string>();

      for (let i = 5; i >= 0; i--) {
        const key = format(subMonths(new Date(), i), "MMM yyyy");
        months[key] = { newUsers: new Set(), returningUsers: new Set() };
      }

      orders?.forEach((o) => {
        const key = format(new Date(o.created_at), "MMM yyyy");
        if (!(key in months)) return;
        if (seenUsers.has(o.user_id)) {
          months[key].returningUsers.add(o.user_id);
        } else {
          months[key].newUsers.add(o.user_id);
          seenUsers.add(o.user_id);
        }
      });

      return Object.entries(months).map(([month, data]) => ({
        month,
        new: data.newUsers.size,
        returning: data.returningUsers.size,
      }));
    },
  });

  // Regional delivery distribution
  const { data: regions, isLoading: regionsLoading } = useQuery({
    queryKey: ["analytics-regions"],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("delivery_address, total_amount")
        .not("delivery_address", "is", null);

      const regionMap: Record<string, { orders: number; revenue: number }> = {};
      orders?.forEach((o) => {
        if (!o.delivery_address) return;
        // Extract region from address (last meaningful word or city-like portion)
        const parts = o.delivery_address.split(",").map((p) => p.trim());
        const region = parts[parts.length - 1] || parts[0] || "Unknown";
        const normalized = region.charAt(0).toUpperCase() + region.slice(1).toLowerCase();
        if (!regionMap[normalized]) regionMap[normalized] = { orders: 0, revenue: 0 };
        regionMap[normalized].orders += 1;
        regionMap[normalized].revenue += Number(o.total_amount);
      });

      return Object.entries(regionMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 8);
    },
  });

  const formatKES = (n: number) => `KES ${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Sales Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Sales Trends (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesLoading ? <Skeleton className="h-[300px] w-full" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} interval={4} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip formatter={(v: number, name: string) => [name === "revenue" ? formatKES(v) : v, name === "revenue" ? "Revenue" : "Orders"]} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" name="Revenue" />
                <Area type="monotone" dataKey="orders" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary) / 0.15)" name="Orders" yAxisId={0} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Popular Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productsLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={popularProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="totalQty" fill="hsl(var(--primary))" name="Units Sold" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Customer Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Customer Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {retentionLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={retention}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="new" stackId="a" fill="hsl(var(--primary))" name="New Customers" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="returning" stackId="a" fill="hsl(var(--secondary))" name="Returning" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Regional Distribution */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Regional Delivery Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {regionsLoading ? <Skeleton className="h-[300px] w-full" /> : !regions?.length ? (
              <p className="text-center text-sm text-muted-foreground py-12">No delivery data yet</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={regions} dataKey="orders" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {regions.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} orders`, "Orders"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {regions.map((r, i) => (
                    <div key={r.name} className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium text-foreground">{r.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-foreground">{r.orders} orders</span>
                        <p className="text-xs text-muted-foreground">{formatKES(r.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
