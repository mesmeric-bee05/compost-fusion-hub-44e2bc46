import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Download, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import AuditLogDetailSheet, { type AuditRow } from "./AuditLogDetailSheet";

const PAGE_SIZE = 25;
const FETCH_CHUNK = 1000;

const ACTIONS = [
  "newsletter.resend",
  "newsletter.delete",
  "newsletter.bulk_delete",
] as const;
type Action = (typeof ACTIONS)[number] | "all";

type Filters = { action: Action; emailQuery: string; from: string; to: string };

const actionVariant = (a: string): "default" | "secondary" | "destructive" => {
  if (a.endsWith(".delete") || a.endsWith(".bulk_delete")) return "destructive";
  if (a.endsWith(".resend")) return "default";
  return "secondary";
};

const applyFilters = (q: any, f: Filters) => {
  let out = q;
  if (f.action !== "all") out = out.eq("action", f.action);
  if (f.from) out = out.gte("created_at", new Date(f.from).toISOString());
  if (f.to) {
    const end = new Date(f.to);
    end.setHours(23, 59, 59, 999);
    out = out.lte("created_at", end.toISOString());
  }
  if (f.emailQuery.trim()) {
    // Postgres array contains: target_emails @> ARRAY[<email>]
    out = out.contains("target_emails", [f.emailQuery.trim().toLowerCase()]);
  }
  return out;
};

export default function AuditLogTable() {
  const [action, setAction] = useState<Action>("all");
  const [emailQuery, setEmailQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [openRow, setOpenRow] = useState<AuditRow | null>(null);

  const filters: Filters = { action, emailQuery, from, to };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-audit-log", filters, page],
    queryFn: async () => {
      let q: any = supabase
        .from("admin_audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      q = applyFilters(q, filters);
      const start = page * PAGE_SIZE;
      const { data, error, count } = await q.range(start, start + PAGE_SIZE - 1);
      if (error) throw error;

      // Resolve admin names via existing helper RPC.
      const ids = Array.from(new Set((data ?? []).map((r: AuditRow) => r.admin_id)));
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await supabase.rpc("get_leaderboard_profiles", {
          user_ids: ids as string[],
        });
        (profiles ?? []).forEach((p: { user_id: string; full_name: string }) => {
          names[p.user_id] = p.full_name;
        });
      }
      const rows = (data ?? []).map((r: AuditRow) => ({ ...r, admin_name: names[r.admin_id] }));
      return { rows: rows as AuditRow[], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const adminOptions = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.admin_id, r.admin_name ?? r.admin_id.slice(0, 8)));
    return Array.from(m.entries());
  }, [rows]);

  const exportCsv = async () => {
    const all: AuditRow[] = [];
    let offset = 0;
    while (true) {
      let q: any = supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false });
      q = applyFilters(q, filters).range(offset, offset + FETCH_CHUNK - 1);
      const { data, error } = await q;
      if (error) {
        toast({ title: "Export failed", description: error.message, variant: "destructive" });
        return;
      }
      const chunk = (data ?? []) as AuditRow[];
      all.push(...chunk);
      if (chunk.length < FETCH_CHUNK) break;
      offset += FETCH_CHUNK;
    }
    if (!all.length) {
      toast({ title: "Nothing to export" });
      return;
    }
    const header = ["created_at", "admin_id", "action", "target_count", "target_emails", "metadata"];
    const csv = [
      header.join(","),
      ...all.map((r) =>
        [
          r.created_at,
          r.admin_id,
          r.action,
          r.target_count,
          (r.target_emails ?? []).join(";"),
          JSON.stringify(r.metadata ?? {}),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${all.length} entries` });
  };

  const clear = () => {
    setAction("all");
    setEmailQuery("");
    setFrom("");
    setTo("");
    setPage(0);
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Admin Audit Log ({total})</h2>
        <Button size="sm" onClick={exportCsv} disabled={total === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export filtered CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs text-muted-foreground">Action</Label>
          <Select value={action} onValueChange={(v) => { setAction(v as Action); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="exact email…"
            value={emailQuery}
            onChange={(e) => { setEmailQuery(e.target.value); setPage(0); }}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
        </div>
        {(action !== "all" || emailQuery || from || to) && (
          <Button variant="ghost" size="sm" className="sm:col-span-4 w-fit" onClick={clear}>
            Clear filters
          </Button>
        )}
      </div>

      {adminOptions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Admins on this page: {adminOptions.map(([_id, name]) => name).join(", ")}
        </p>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Targets</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => setOpenRow(r)}
                data-testid="audit-log-row"
              >
                <TableCell className="text-sm">
                  {format(new Date(r.created_at), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="font-medium">{r.admin_name ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{r.admin_id.slice(0, 8)}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={actionVariant(r.action)}>{r.action}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {r.target_count}
                  {r.target_emails?.[0] && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {r.target_emails[0]}
                      {r.target_count > 1 && ` +${r.target_count - 1}`}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[16rem] truncate">
                  {Object.keys((r.metadata as Record<string, unknown>) ?? {}).length
                    ? JSON.stringify(r.metadata)
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No audit log entries match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0 ? "0 results" : `Page ${page + 1} of ${totalPages} • ${total} total`}
          {isFetching && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AuditLogDetailSheet row={openRow} open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)} />
    </div>
  );
}
