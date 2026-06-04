import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Truck, User, Mail, MoreHorizontal } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
const statuses: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const statusColor: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const formatKES = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

export default function OrdersTable() {
  const qc = useQueryClient();

  // Fetch orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for customer names
  const userIds = [...new Set(orders?.map((o) => o.user_id) ?? [])];
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles", userIds],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
  });

  // Fetch drivers for assignment dropdown
  const { data: drivers } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: async () => {
      const { data: driverRoles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "driver");
      if (error) throw error;
      if (!driverRoles?.length) return [];

      const driverIds = driverRoles.map((r) => r.user_id);
      const { data: driverProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", driverIds);
      return driverProfiles ?? [];
    },
  });

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

  // Update order status with email + SMS notifications
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, userId, totalAmount, deliveryAddress, deliveryPhone }: {
      id: string;
      status: OrderStatus;
      userId: string;
      totalAmount: number;
      deliveryAddress: string | null;
      deliveryPhone: string | null;
    }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;

      const profile = profileMap.get(userId);
      const customerName = profile?.full_name || "Valued Customer";

      // Fire email notification (best-effort)
      supabase.functions.invoke("send-order-status-email", {
        body: { orderId: id, orderStatus: status, customerName, totalAmount, deliveryAddress, userId },
      }).catch((e) => console.warn("Email failed:", e));

      // Fire SMS notification (best-effort)
      const smsPhone = deliveryPhone || profile?.phone;
      if (smsPhone) {
        const smsMessages: Record<string, string> = {
          confirmed: `Hi ${customerName}, your Captain Compost order #${id.slice(0, 8).toUpperCase()} (KES ${totalAmount.toLocaleString()}) has been confirmed! We're preparing it for dispatch. 🌿`,
          shipped: `Hi ${customerName}, your Captain Compost order #${id.slice(0, 8).toUpperCase()} is on its way! You'll receive it soon. 🚚`,
          delivered: `Hi ${customerName}, your Captain Compost order #${id.slice(0, 8).toUpperCase()} has been delivered! Thank you for going green with us. ✅🌱`,
          cancelled: `Hi ${customerName}, your Captain Compost order #${id.slice(0, 8).toUpperCase()} has been cancelled. Contact info@captaincompost.co.ke for questions.`,
        };
        if (smsMessages[status]) {
          supabase.functions.invoke("send-sms-notification", {
            body: { phone: smsPhone, message: smsMessages[status] },
          }).catch((e) => console.warn("SMS failed:", e));
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order updated", description: "Status changed & customer notified." });
    },
    onError: (err) => {
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    },
  });

  // Assign driver
  const assignDriver = useMutation({
    mutationFn: async ({ orderId, driverId }: { orderId: string; driverId: string | null }) => {
      const { error } = await supabase.from("orders").update({ driver_id: driverId }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Driver assigned" });
    },
    onError: (err) => {
      toast({ title: "Assignment failed", description: String(err), variant: "destructive" });
    },
  });

  // Resend payment status email (idempotent: clears order_email_log row first, then re-invokes)
  const resendPaymentEmail = useMutation({
    mutationFn: async ({ orderId, userId, totalAmount, deliveryAddress, status }: {
      orderId: string; userId: string; totalAmount: number;
      deliveryAddress: string | null; status: "payment_pending" | "payment_completed" | "payment_failed";
    }) => {
      // Clear the prior idempotency claim so the function will re-send
      const { error: delErr } = await supabase.from("order_email_log")
        .delete().eq("order_id", orderId).eq("status", status);
      if (delErr) throw delErr;

      const profile = profileMap.get(userId);
      const customerName = profile?.full_name || "Valued Customer";
      const { data, error } = await supabase.functions.invoke("send-order-status-email", {
        body: { orderId, orderStatus: status, customerName, totalAmount, deliveryAddress, userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const skipped = (data as { skipped?: boolean } | null)?.skipped;
      toast({
        title: skipped ? "Email skipped" : "Email resent",
        description: skipped
          ? "No template matched or RESEND_API_KEY missing."
          : "Payment status email has been resent.",
      });
    },
    onError: (err) => {
      toast({ title: "Resend failed", description: String(err), variant: "destructive" });
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Update</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.map((order) => {
            const profile = profileMap.get(order.user_id);
            return (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs text-foreground">{order.id.slice(0, 8)}</TableCell>
                <TableCell className="text-sm text-foreground">{format(new Date(order.created_at), "MMM d")}</TableCell>
                <TableCell className="max-w-[120px] truncate text-sm text-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {profile?.full_name || "—"}
                  </div>
                </TableCell>
                <TableCell className="font-medium text-foreground">{formatKES(Number(order.total_amount))}</TableCell>
                <TableCell>
                  <Badge className={statusColor[order.status as OrderStatus]}>{order.status}</Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={(order as any).driver_id || "unassigned"}
                    onValueChange={(v) => assignDriver.mutate({
                      orderId: order.id,
                      driverId: v === "unassigned" ? null : v,
                    })}
                  >
                    <SelectTrigger className="w-36">
                      <Truck className="mr-1 h-3 w-3" />
                      <SelectValue placeholder="Assign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {drivers?.map((d) => (
                        <SelectItem key={d.user_id} value={d.user_id}>
                          {d.full_name || d.phone || d.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(v) =>
                      updateStatus.mutate({
                        id: order.id,
                        status: v as OrderStatus,
                        userId: order.user_id,
                        totalAmount: Number(order.total_amount),
                        deliveryAddress: order.delivery_address,
                        deliveryPhone: order.delivery_phone,
                      })
                    }
                  >
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Order ${order.id.slice(0, 8)} actions`}
                        disabled={resendPaymentEmail.isPending}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" /> Resend payment email
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {(["payment_pending", "payment_completed", "payment_failed"] as const).map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => resendPaymentEmail.mutate({
                            orderId: order.id,
                            userId: order.user_id,
                            totalAmount: Number(order.total_amount),
                            deliveryAddress: order.delivery_address,
                            status: s,
                          })}
                        >
                          {s.replace("payment_", "").replace(/^\w/, (c) => c.toUpperCase())}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {!orders?.length && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">No orders yet</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
