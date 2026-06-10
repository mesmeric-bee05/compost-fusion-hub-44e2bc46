import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Download, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import AuditLogDetailSheet, { type AuditRow } from "./AuditLogDetailSheet";

const PAGE_SIZE = 25;

const ACTIONS = [
  "newsletter.resend",
  "newsletter.delete",
  "newsletter.bulk_delete",
  "audit.export",
  "payment_email.resend",
] as const;
type Action = (typeof ACTIONS)[number] | "all";
type Mode = "contains" | "multi-exact";

type Filters = {
  action: Action;
  mode: Mode;
  emailQuery: string;
  emails: string[];
  invalidEmails: string[];
  from: string;
  to: string;
};

const emailSchema = z.string().email();

const actionVariant = (a: string): "default" | "secondary" | "destructive" => {
  if (a.endsWith(".delete") || a.endsWith(".bulk_delete")) return "destructive";
  if (a.endsWith(".resend")) return "default";
  return "secondary";
};

const parseEmailList = (raw: string) => {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const t of tokens) {
    if (emailSchema.safeParse(t).success) emails.push(t);
    else invalid.push(t);
  }
  return { emails: Array.from(new Set(emails)), invalid: Array.from(new Set(invalid)) };
};

const useDebounced = <T,>(value: T, ms = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
};

export default function AuditLogTable() {
  const [action, setAction] = useState<Action>("all");
  const [mode, setMode] = useState<Mode>("contains");
  const [emailQuery, setEmailQuery] = useState("");
  const [emailListInput, setEmailListInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [openRow, setOpenRow] = useState<AuditRow | null>(null);
  const [exporting, setExporting] = useState(false);

  const { emails: parsedEmails, invalid: invalidEmails } = useMemo(
    () => parseEmailList(emailListInput),
    [emailListInput],
  );

  const debouncedQuery = useDebounced(emailQuery, 300);
  const debouncedEmails = useDebounced(parsedEmails.join(","), 300);

  const filters: Filters = {
    action,
    mode,
    emailQuery: debouncedQuery,
    emails: debouncedEmails ? debouncedEmails.split(",") : [],
    invalidEmails,
    from,
    to,
  };

  const fromIso = from ? new Date(from).toISOString() : null;
  const toIso = (() => {
    if (!to) return null;
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    return end.toISOString();
  })();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-audit-log", { ...filters, page }],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("search_audit_log", {
        _action: action === "all" ? null : action,
        _from: fromIso,
        _to: toIso,
        _email_query: mode === "contains" ? (filters.emailQuery || null) : null,
        _emails: mode === "multi-exact" && filters.emails.length ? filters.emails : null,
        _mode: mode,
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      const rows = (data ?? []) as Array<AuditRow & { total_count: number }>;
      const total = rows[0]?.total_count ?? 0;

      const ids = Array.from(new Set(rows.map((r) => r.admin_id)));
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await (supabase.rpc as any)("get_audit_admin_names", {
          user_ids: ids,
        });
        (profiles ?? []).forEach((p: { user_id: string; full_name: string }) => {
          names[p.user_id] = p.full_name;
        });
      }
      return {
        rows: rows.map((r) => ({ ...r, admin_name: names[r.admin_id] })) as AuditRow[],
        count: Number(total),
      };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [action, mode, debouncedQuery, debouncedEmails, from, to]);

  const exportCsv = async () => {
    if (total === 0) return;
    setExporting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        toast({ title: "Sign in required", variant: "destructive" });
        return;
      }
      const projectRef = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectRef}.supabase.co/functions/v1/export-admin-audit-log`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: action === "all" ? null : action,
          from: fromIso,
          to: toIso,
          emailQuery: mode === "contains" ? (filters.emailQuery || null) : null,
          emails: mode === "multi-exact" && filters.emails.length ? filters.emails : null,
          mode,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429) {
          toast({
            title: "Rate limited",
            description: `Too many exports. Try again in ${body?.error?.retry_after ?? 60}s.`,
            variant: "destructive",
          });
          return;
        }
        if (res.status === 401 || res.status === 403) {
          toast({
            title: "Forbidden",
            description: body?.error?.message ?? "You are not authorized to export.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Export failed",
          description: body?.error?.message ?? `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      const blob = await res.blob();
      const exportedCount = res.headers.get("X-Export-Count") ?? String(total);
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `admin-audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(dlUrl);
      toast({ title: `Exported ${exportedCount} entries` });
    } catch (e) {
      toast({ title: "Export failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const clear = () => {
    setAction("all");
    setEmailQuery("");
    setEmailListInput("");
    setFrom("");
    setTo("");
    setPage(0);
  };

  const removePill = (e: string) => {
    setEmailListInput(parsedEmails.filter((x) => x !== e).join(", "));
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  const hasFilter =
    action !== "all" || emailQuery || emailListInput || from || to;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Admin Audit Log ({total})</h2>
        <Button size="sm" onClick={exportCsv} disabled={total === 0 || exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export filtered CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs text-muted-foreground">Action</Label>
          <Select value={action} onValueChange={(v) => setAction(v as Action)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="sm:col-span-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Email match</Label>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="h-8">
                <TabsTrigger value="contains" className="h-6 text-xs">Contains</TabsTrigger>
                <TabsTrigger value="multi-exact" className="h-6 text-xs">Multi-exact</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {mode === "contains" ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Substring (e.g. 'gmail')"
                value={emailQuery}
                onChange={(e) => setEmailQuery(e.target.value)}
                aria-label="Partial email search"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Paste emails separated by commas, spaces, or newlines"
                value={emailListInput}
                onChange={(e) => setEmailListInput(e.target.value)}
                aria-label="Multi email exact match"
              />
              <div className="flex flex-wrap gap-1">
                {parsedEmails.map((e) => (
                  <Badge key={e} variant="secondary" className="gap-1">
                    {e}
                    <button
                      type="button"
                      onClick={() => removePill(e)}
                      className="ml-1 hover:text-destructive"
                      aria-label={`Remove ${e}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {invalidEmails.map((e) => (
                  <Badge key={e} variant="destructive">{e} (invalid)</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {parsedEmails.length} valid · {invalidEmails.length} invalid
              </p>
            </div>
          )}
        </div>
        {hasFilter && (
          <Button variant="ghost" size="sm" className="sm:col-span-4 w-fit" onClick={clear}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Targets</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow
                key={r.id}
                className="cursor-pointer odd:bg-muted/20 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setOpenRow(r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenRow(r);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Open audit log entry ${idx + 1}`}
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
