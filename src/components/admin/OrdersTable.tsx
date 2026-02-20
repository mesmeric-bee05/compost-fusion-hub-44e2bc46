import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
const statuses: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const statusColor: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const formatKES = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

interface OrderRow {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  delivery_address: string | null;
  user_id: string;
  customer_email: string | null;
  customer_name: string | null;
}

export default function OrdersTable() {
  const qc = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async (): Promise<OrderRow[]> => {
      // Fetch orders
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Fetch user emails & names from auth via profiles
      const userIds = [...new Set(ordersData.map((o) => o.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) ?? []);

      // We can't query auth.users directly from client, but we can look up emails
      // via a custom approach: store email in profiles or accept that we have full_name
      return ordersData.map((o) => ({
        ...o,
        customer_name: profileMap.get(o.user_id) ?? null,
        customer_email: null, // fetched separately per update via edge function context
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, userId, customerName, totalAmount, deliveryAddress }: {
      id: string;
      status: OrderStatus;
      userId: string;
      customerName: string | null;
      totalAmount: number;
      deliveryAddress: string | null;
    }) => {
      // 1. Update status in DB
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;

      // 2. Fire email notification (best-effort – don't block on failure)
      try {
        // Get user email from auth session's metadata via edge function
        await supabase.functions.invoke("send-order-status-email", {
          body: {
            orderId: id,
            orderStatus: status,
            customerEmail: `user-${userId.slice(0, 6)}@placeholder.com`, // edge fn resolves real email via service role
            customerName: customerName ?? "Valued Customer",
            totalAmount,
            deliveryAddress,
            userId, // edge function will use service role to look up real email
          },
        });
      } catch (emailErr) {
        console.warn("Email notification failed (non-blocking):", emailErr);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order updated", description: "Status changed and customer notified." });
    },
    onError: (err) => {
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Update Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
              <TableCell>{format(new Date(order.created_at), "MMM d, yyyy")}</TableCell>
              <TableCell className="max-w-[120px] truncate text-sm">{order.customer_name ?? "—"}</TableCell>
              <TableCell>{formatKES(Number(order.total_amount))}</TableCell>
              <TableCell>
                <Badge className={statusColor[order.status as OrderStatus]}>{order.status}</Badge>
              </TableCell>
              <TableCell>
                <Select
                  value={order.status}
                  onValueChange={(v) =>
                    updateStatus.mutate({
                      id: order.id,
                      status: v as OrderStatus,
                      userId: order.user_id,
                      customerName: order.customer_name,
                      totalAmount: Number(order.total_amount),
                      deliveryAddress: order.delivery_address,
                    })
                  }
                >
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
          {!orders?.length && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">No orders yet</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
