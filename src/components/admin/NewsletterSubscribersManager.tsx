import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Download, Copy, Search } from "lucide-react";
import { format } from "date-fns";

type Subscriber = Tables<"newsletter_subscribers">;

export default function NewsletterSubscribersManager() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const { data: subs, isLoading } = useQuery({
    queryKey: ["admin-newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });
      if (error) throw error;
      return data as Subscriber[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] });
      toast({ title: "Subscriber removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    if (!subs) return [];
    const q = query.trim().toLowerCase();
    return q ? subs.filter((s) => s.email.toLowerCase().includes(q)) : subs;
  }, [subs, query]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const rows = [["email", "subscribed_at"], ...filtered.map((s) => [s.email, s.subscribed_at])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${filtered.length} subscribers` });
  };

  const copyEmails = async () => {
    if (!filtered.length) return;
    await navigator.clipboard.writeText(filtered.map((s) => s.email).join(", "));
    toast({ title: `Copied ${filtered.length} emails` });
  };

  if (isLoading)
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">
          Newsletter Subscribers ({subs?.length ?? 0})
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyEmails} disabled={!filtered.length}>
            <Copy className="mr-2 h-4 w-4" />Copy emails
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search email…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.email}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(s.subscribed_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove.mutate(s.id)}
                    aria-label="Remove subscriber"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  {subs?.length ? "No matches" : "No subscribers yet"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
