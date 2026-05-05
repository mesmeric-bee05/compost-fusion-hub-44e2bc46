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

export default function NewsletterSubscribersManager() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ ids: string[]; emails: string[] } | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-newsletter-subscribers", { query, from, to, page }],
    queryFn: async () => {
      let q = supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact" })
        .order("subscribed_at", { ascending: false });

      if (query.trim()) q = q.ilike("email", `%${query.trim()}%`);
      if (from) q = q.gte("subscribed_at", new Date(from).toISOString());
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        q = q.lte("subscribed_at", end.toISOString());
      }

      const start = page * PAGE_SIZE;
      const { data, error, count } = await q.range(start, start + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Subscriber[], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("newsletter_subscribers").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] });
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast({ title: `Removed ${ids.length} subscriber${ids.length > 1 ? "s" : ""}` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resend = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke("send-newsletter-welcome", {
        body: { email },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast({ title: "Welcome email sent" }),
    onError: (e: Error) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);
  const exportable = selectedRows.length ? selectedRows : rows;

  const buildCsv = (subs: Subscriber[]) => {
    const csvRows = [["email", "subscribed_at"], ...subs.map((s) => [s.email, s.subscribed_at])];
    return csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  };

  const exportCsv = () => {
    if (!exportable.length) return;
    const blob = new Blob([buildCsv(exportable)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${exportable.length} subscribers` });
  };

  const copyEmails = async () => {
    if (!exportable.length) return;
    await navigator.clipboard.writeText(exportable.map((s) => s.email).join(", "));
    toast({ title: `Copied ${exportable.length} emails` });
  };

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const askDelete = (subs: Subscriber[]) => {
    if (!subs.length) return;
    setConfirm({ ids: subs.map((s) => s.id), emails: subs.map((s) => s.email) });
  };

  const clearFilters = () => { setQuery(""); setFrom(""); setTo(""); setPage(0); };

  if (isLoading)
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">
          Newsletter Subscribers ({total})
          {selected.size > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {selected.size} selected
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyEmails} disabled={!exportable.length}>
            <Copy className="mr-2 h-4 w-4" />Copy {selected.size ? "selected" : "page"}
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={!exportable.length}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => askDelete(selectedRows)}
            >
              <Trash2 className="mr-2 h-4 w-4" />Delete {selected.size}
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
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
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
        {(query || from || to) && (
          <Button variant="ghost" size="sm" className="sm:col-span-4 w-fit" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allOnPageSelected}
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
            {rows.map((s) => (
              <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(s.id)}
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
                    onClick={() => resend.mutate(s.email)}
                    disabled={resend.isPending}
                    aria-label="Resend welcome email"
                    title="Resend welcome email"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => askDelete([s])}
                    aria-label="Remove subscriber"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {confirm?.ids.length} subscriber{(confirm?.ids.length ?? 0) > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently unsubscribes{" "}
              {confirm && confirm.emails.length <= 3
                ? confirm.emails.join(", ")
                : `${confirm?.emails.length} addresses`}{" "}
              from the newsletter list. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) remove.mutate(confirm.ids);
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
