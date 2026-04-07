import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Eye, Trash2, Mail, Phone } from "lucide-react";
import { format } from "date-fns";

type Submission = Tables<"contact_submissions">;

export default function ContactSubmissionsManager() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Submission | null>(null);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["admin-contact-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Submission[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_submissions").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-contact-submissions"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contact-submissions"] });
      toast({ title: "Submission deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openDetail = (s: Submission) => {
    setSelected(s);
    if (!s.is_read) markRead.mutate(s.id);
  };

  const unreadCount = submissions?.filter((s) => !s.is_read).length ?? 0;

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Contact Submissions ({submissions?.length ?? 0})
          {unreadCount > 0 && <Badge className="ml-2" variant="destructive">{unreadCount} new</Badge>}
        </h2>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions?.map((s) => (
              <TableRow key={s.id} className={!s.is_read ? "bg-primary/5" : ""}>
                <TableCell>
                  <Badge variant={s.is_read ? "secondary" : "default"}>{s.is_read ? "Read" : "New"}</Badge>
                </TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell><Badge variant="outline">{s.interest || "General"}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {s.created_at ? format(new Date(s.created_at), "MMM d, yyyy") : "—"}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => openDetail(s)}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {submissions?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No submissions yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Message from {selected?.name}</DialogTitle>
            <DialogDescription>
              Submitted {selected?.created_at ? format(new Date(selected.created_at), "PPpp") : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                {selected.email && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-4 w-4" /> {selected.email}
                  </div>
                )}
                {selected.phone && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-4 w-4" /> {selected.phone}
                  </div>
                )}
              </div>
              {selected.county && <p className="text-sm text-muted-foreground">County: {selected.county}</p>}
              {selected.interest && <Badge variant="outline">{selected.interest}</Badge>}
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{selected.message}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
