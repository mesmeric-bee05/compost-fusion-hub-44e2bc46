import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

export type AuditRow = Tables<"admin_audit_log"> & { admin_name?: string | null };

const actionVariant = (a: string): "default" | "secondary" | "destructive" => {
  if (a.endsWith(".delete") || a.endsWith(".bulk_delete")) return "destructive";
  if (a.endsWith(".resend")) return "default";
  return "secondary";
};

export default function AuditLogDetailSheet({
  row,
  open,
  onOpenChange,
}: {
  row: AuditRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied` }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Audit log entry</SheetTitle>
          <SheetDescription>Immutable record of an admin action.</SheetDescription>
        </SheetHeader>
        {row && (
          <ScrollArea className="mt-4 flex-1 pr-4">
            <div className="space-y-4 text-sm">
              <section>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">When</h4>
                <p>{format(new Date(row.created_at), "PPpp")}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                </p>
              </section>
              <section>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Admin</h4>
                <p className="font-medium">{row.admin_name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground break-all">{row.admin_id}</p>
              </section>
              <section>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Action</h4>
                <Badge variant={actionVariant(row.action)}>{row.action}</Badge>
                <span className="ml-2 text-muted-foreground">
                  {row.target_count} target{row.target_count === 1 ? "" : "s"}
                </span>
              </section>
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Target emails ({row.target_emails?.length ?? 0})
                  </h4>
                  {row.target_emails?.length ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copy(row.target_emails!.join("\n"), "Emails")}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  ) : null}
                </div>
                {row.target_emails?.length ? (
                  <ul className="rounded border bg-muted/30 p-2 max-h-48 overflow-auto text-xs space-y-0.5">
                    {row.target_emails.map((e, i) => <li key={i} className="break-all">{e}</li>)}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No emails recorded.</p>
                )}
                {row.target_count > (row.target_emails?.length ?? 0) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Capped to first 50 emails. Total target count: {row.target_count}.
                  </p>
                )}
              </section>
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Metadata</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copy(JSON.stringify(row, null, 2), "Row JSON")}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy JSON
                  </Button>
                </div>
                <pre className="rounded border bg-muted/30 p-2 text-xs overflow-auto max-h-64">
                  {JSON.stringify(row.metadata ?? {}, null, 2)}
                </pre>
              </section>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
