import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  orderId: string;
}

interface ResendEntry {
  id: string;
  admin_id: string;
  created_at: string;
  metadata: {
    order_id?: string;
    status?: string;
    template?: string;
    result?: string;
    resend_id?: string | null;
    reason?: string | null;
  } | null;
  admin_name?: string;
}

const resultVariant = (r?: string) =>
  r === "sent" ? "default" : r === "rate_limited" ? "secondary" : "destructive";

export default function PaymentEmailResendHistory({ orderId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["payment-email-resend-history", orderId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("search_audit_log", {
        _action: "payment_email.resend",
        _from: null,
        _to: null,
        _email_query: null,
        _emails: null,
        _mode: "contains",
        _limit: 100,
        _offset: 0,
      });
      if (error) throw error;
      const rows = ((data ?? []) as ResendEntry[]).filter(
        (r) => r.metadata?.order_id === orderId,
      );
      const ids = Array.from(new Set(rows.map((r) => r.admin_id)));
      if (ids.length) {
        const { data: profiles } = await (supabase.rpc as any)("get_audit_admin_names", {
          user_ids: ids,
        });
        const map = new Map(
          ((profiles ?? []) as Array<{ user_id: string; full_name: string }>).map((p) => [p.user_id, p.full_name]),
        );
        rows.forEach((r) => { r.admin_name = map.get(r.admin_id); });
      }
      return rows;
    },
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );

  if (!data?.length)
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        <Mail className="mx-auto mb-1 h-4 w-4" /> No payment email resends recorded for this order.
      </div>
    );

  return (
    <div className="rounded-lg border overflow-x-auto" data-testid="payment-email-resend-history">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Admin</TableHead>
            <TableHead>When</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Resend ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow key={r.id} data-testid="payment-email-resend-row">
              <TableCell className="text-sm">{r.admin_name ?? r.admin_id.slice(0, 8)}</TableCell>
              <TableCell className="text-sm">{format(new Date(r.created_at), "MMM d, HH:mm:ss")}</TableCell>
              <TableCell className="text-xs font-mono">{r.metadata?.template ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={resultVariant(r.metadata?.result)}>
                  {r.metadata?.result ?? "—"}
                </Badge>
              </TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">
                {r.metadata?.resend_id ?? r.metadata?.reason ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
