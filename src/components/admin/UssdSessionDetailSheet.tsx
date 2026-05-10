import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export type UssdSession = {
  id: string;
  session_id: string;
  phone_number: string;
  menu_state: string | null;
  is_active: boolean | null;
  session_data: Record<string, unknown> | null;
  created_at: string;
};

type Transition = { from?: string; to?: string; at?: string; payload?: unknown };

export default function UssdSessionDetailSheet({
  session,
  open,
  onOpenChange,
}: {
  session: UssdSession | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const transitions: Transition[] = Array.isArray(
    (session?.session_data as { transitions?: Transition[] } | null)?.transitions,
  )
    ? ((session!.session_data as { transitions: Transition[] }).transitions)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" aria-describedby="ussd-detail-desc">
        <SheetHeader>
          <SheetTitle>USSD session</SheetTitle>
          <SheetDescription id="ussd-detail-desc">
            Inspect session metadata and the menu-state timeline for this caller.
          </SheetDescription>
        </SheetHeader>
        {session && (
          <div className="mt-4 space-y-4 text-sm">
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">Session ID</div>
              <div className="font-mono break-all">{session.session_id}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Phone</div>
                <div>{session.phone_number}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">State</div>
                <Badge variant="secondary">{session.menu_state ?? "—"}</Badge>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Active</div>
                <Badge variant={session.is_active ? "default" : "secondary"}>
                  {session.is_active ? "Active" : "Closed"}
                </Badge>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Started</div>
                <div>{format(new Date(session.created_at), "MMM d, yyyy HH:mm")}</div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase text-muted-foreground">State transitions</div>
              {transitions.length === 0 ? (
                <p className="text-muted-foreground">No transitions recorded for this session.</p>
              ) : (
                <ol className="space-y-2 border-l border-border pl-4">
                  {transitions.map((t, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <div className="text-xs text-muted-foreground">
                        {t.at ? format(new Date(t.at), "HH:mm:ss") : "—"}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t.from ?? "·"}</span>
                        <span className="mx-1">→</span>
                        <span className="font-medium">{t.to ?? "·"}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs uppercase text-muted-foreground">Raw session data</div>
              <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
                {JSON.stringify(session.session_data ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
