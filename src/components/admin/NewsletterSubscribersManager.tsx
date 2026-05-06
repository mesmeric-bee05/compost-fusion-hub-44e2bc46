import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Download, Copy, Search, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type Subscriber = Tables<"newsletter_subscribers">;

const PAGE_SIZE = 20;
const FETCH_CHUNK = 1000;

type Filters = { query: string; from: string; to: string };

function applyFilters<T extends ReturnType<typeof supabase.from>>(q: T, f: Filters) {
  let out = q as any;
  if (f.query.trim()) out = out.ilike("email", `%${f.query.trim()}%`);
  if (f.from) out = out.gte("subscribed_at", new Date(f.from).toISOString());
  if (f.to) {
    const end = new Date(f.to);
    end.setHours(23, 59, 59, 999);
    out = out.lte("subscribed_at", end.toISOString());
  }
  return out;
}

export default function NewsletterSubscribersManager() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [matchAll, setMatchAll] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { mode: "ids"; ids: string[]; emails: string[] }
    | { mode: "all"; total: number; filters: Filters }
    | null
  >(null);

  const filters: Filters = { query, from, to };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-newsletter-subscribers", { ...filters, page }],
    queryFn: async () => {
      let q: any = supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact" })
        .order("subscribed_at", { ascending: false });
      q = applyFilters(q, filters);
      const start = page * PAGE_SIZE;
      const { data, error, count } = await q.range(start, start + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Subscriber[], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const logAudit = async (action: string, emails: string[], metadata?: Record<string, unknown>) => {
    try {
      await supabase.functions.invoke("log-admin-action", { body: { action, emails, metadata } });
    } catch {/* best-effort */}
  };

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const emails = rows.filter((r) => ids.includes(r.id)).map((r) => r.email);
      const { error } = await supabase.from("newsletter_subscribers").delete().in("id", ids);
      if (error) throw error;
      return { ids, emails };
    },
    onSuccess: ({ ids, emails }) => {
      qc.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] });
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      void logAudit(ids.length > 1 ? "newsletter.bulk_delete" : "newsletter.delete", emails, {
        count: ids.length,
      });
      toast({ title: `Removed ${ids.length} subscriber${ids.length > 1 ? "s" : ""}` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeAllMatching = useMutation({
    mutationFn: async (f: Filters) => {
      // Fetch matching emails (capped) for audit + delete in a single filter query
      let selQ: any = supabase.from("newsletter_subscribers").select("email", { count: "exact" });
      selQ = applyFilters(selQ, f).limit(FETCH_CHUNK);
      const { data: matched, error: selErr, count } = await selQ;
      if (selErr) throw selErr;
      const emails = (matched ?? []).map((r: { email: string }) => r.email);

      let delQ: any = supabase.from("newsletter_subscribers").delete({ count: "exact" });
      delQ = applyFilters(delQ, f);
      const { error: delErr, count: deleted } = await delQ;
      if (delErr) throw delErr;
      return { count: deleted ?? count ?? emails.length, emails };
    },
    onSuccess: ({ count, emails }) => {
      qc.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] });
      setSelected(new Set());
      setMatchAll(false);
      void logAudit("newsletter.bulk_delete", emails, { count, mode: "filter_match" });
      toast({ title: `Removed ${count} subscribers` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resend = useMutation({
    mutationFn: async (sub: Subscriber) => {
      setResendingId(sub.id);
      const { data, error } = await supabase.functions.invoke("send-newsletter-welcome", {
        body: { email: sub.email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error.message ?? "Send failed");
      return { email: sub.email, data };
    },
    onSuccess: ({ email }) => toast({ title: `Welcome email sent to ${email}` }),
    onError: (e: Error) =>
      toast({ title: "Failed to resend", description: e.message, variant: "destructive" }),
    onSettled: () => setResendingId(null),
  });

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);

  const fetchAllMatching = async (f: Filters): Promise<Subscriber[]> => {
    const all: Subscriber[] = [];
    let page = 0;
    while (true) {
      let q: any = supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });
      q = applyFilters(q, f).range(page * FETCH_CHUNK, page * FETCH_CHUNK + FETCH_CHUNK - 1);
      const { data, error } = await q;
      if (error) throw error;
      const chunk = (data ?? []) as Subscriber[];
      all.push(...chunk);
      if (chunk.length < FETCH_CHUNK) break;
      page++;
    }
    return all;
  };

  const buildCsv = (subs: Subscriber[]) => {
    const csvRows = [["email", "subscribed_at"], ...subs.map((s) => [s.email, s.subscribed_at])];
    return csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  };

  const exportCsv = async () => {
    const subs = matchAll
      ? await fetchAllMatching(filters)
      : selectedRows.length
        ? selectedRows
        : rows;
    if (!subs.length) return;
    const blob = new Blob([buildCsv(subs)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${subs.length} subscribers` });
  };

  const copyEmails = async () => {
    const subs = matchAll
      ? await fetchAllMatching(filters)
      : selectedRows.length
        ? selectedRows
        : rows;
    if (!subs.length) return;
    await navigator.clipboard.writeText(subs.map((s) => s.email).join(", "));
    toast({ title: `Copied ${subs.length} emails` });
  };

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const togglePage = () => {
    setMatchAll(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const askDeleteIds = (subs: Subscriber[]) => {
    if (!subs.length) return;
    setConfirm({ mode: "ids", ids: subs.map((s) => s.id), emails: subs.map((s) => s.email) });
  };
  const askDeleteAllMatching = () => {
    setConfirm({ mode: "all", total, filters });
  };

  const clearFilters = () => { setQuery(""); setFrom(""); setTo(""); setPage(0); setMatchAll(false); };

  if (isLoading)
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const showMatchAllBanner = allOnPageSelected && total > rows.length && !matchAll;
  const effectiveCount = matchAll ? total : selected.size;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">
          Newsletter Subscribers ({total})
          {effectiveCount > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {effectiveCount} selected{matchAll ? " (all matching)" : ""}
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyEmails} disabled={!rows.length}>
            <Copy className="mr-2 h-4 w-4" />
            Copy {matchAll ? "all matching" : selected.size ? "selected" : "page"}
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
          {(selected.size > 0 || matchAll) && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => (matchAll ? askDeleteAllMatching() : askDeleteIds(selectedRows))}
            >
              <Trash2 className="mr-2 h-4 w-4" />Delete {matchAll ? total : selected.size}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search email…"
            className="pl-9"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); setMatchAll(false); }}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); setMatchAll(false); }} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); setMatchAll(false); }} />
        </div>
        {(query || from || to) && (
          <Button variant="ghost" size="sm" className="sm:col-span-4 w-fit" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {(showMatchAllBanner || matchAll) && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
        >
          {matchAll ? (
            <>
              <span>All <strong>{total}</strong> matching subscribers selected.</span>
              <Button variant="ghost" size="sm" onClick={() => { setMatchAll(false); setSelected(new Set()); }}>
                Clear selection
              </Button>
            </>
          ) : (
            <>
              <span>{selected.size} selected on this page.</span>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { setMatchAll(true); setSelected(new Set()); }}>
                Select all {total} matching subscribers
              </Button>
            </>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={matchAll || allOnPageSelected}
                  onCheckedChange={togglePage}
                  aria-label="Select all on page"
                />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => {
              const isResending = resendingId === s.id && resend.isPending;
              return (
                <TableRow key={s.id} data-state={selected.has(s.id) || matchAll ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={matchAll || selected.has(s.id)}
                      disabled={matchAll}
                      onCheckedChange={(v) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (v) next.add(s.id); else next.delete(s.id);
                          return next;
                        });
                      }}
                      aria-label={`Select ${s.email}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(s.subscribed_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => resend.mutate(s)}
                      disabled={isResending}
                      aria-label={isResending ? "Sending welcome email" : "Resend welcome email"}
                      aria-busy={isResending}
                      title="Resend welcome email"
                    >
                      {isResending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => askDeleteIds([s])}
                      aria-label="Remove subscriber"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {total ? "No matches on this page" : "No subscribers yet"}
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

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.mode === "all"
                ? `Remove all ${confirm.total} matching subscribers?`
                : `Remove ${confirm?.ids.length} subscriber${(confirm?.ids.length ?? 0) > 1 ? "s" : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.mode === "all"
                ? "This permanently unsubscribes every subscriber matching the current filters. This cannot be undone."
                : confirm
                  ? <>This permanently unsubscribes{" "}
                      {confirm.emails.length <= 3 ? confirm.emails.join(", ") : `${confirm.emails.length} addresses`}{" "}
                      from the newsletter list. This cannot be undone.</>
                  : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm?.mode === "ids") remove.mutate(confirm.ids);
                else if (confirm?.mode === "all") removeAllMatching.mutate(confirm.filters);
                setConfirm(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
