import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";
import UssdSessionDetailSheet, { type UssdSession } from "./UssdSessionDetailSheet";
import UssdSessionsSkeleton from "./skeletons/UssdSessionsSkeleton";

const PAGE_SIZE = 25;

const STATES = [
  "MAIN",
  "SHOP_LIST",
  "PRODUCT_DETAIL",
  "CART",
  "CHECKOUT",
] as const;

const useDebounced = <T,>(value: T, ms = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
};

export default function UssdSessionsTable() {
  const [q, setQ] = useState("");
  const [state, setState] = useState<string>("all");
  const [active, setActive] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [openRow, setOpenRow] = useState<UssdSession | null>(null);
  const debouncedQ = useDebounced(q, 300);

  useEffect(() => setPage(0), [debouncedQ, state, active]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-ussd-sessions", { debouncedQ, state, active, page }],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("search_ussd_sessions", {
        _q: debouncedQ || null,
        _state: state === "all" ? null : state,
        _active: active === "all" ? null : active === "active",
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      const rows = (data ?? []) as Array<UssdSession & { total_count: number }>;
      return { rows: rows as UssdSession[], total: Number(rows[0]?.total_count ?? 0) };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (isLoading) return <UssdSessionsSkeleton />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Label className="text-xs text-muted-foreground">Search phone or session ID</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="2547… or session id"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search USSD sessions"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">State</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Started</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Session ID</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Status</TableHead>
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
                aria-label={`Open USSD session ${idx + 1}`}
                data-testid="ussd-session-row"
              >
                <TableCell className="text-sm">{format(new Date(r.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                <TableCell className="text-sm font-mono">{r.phone_number}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground max-w-[14rem] truncate">{r.session_id}</TableCell>
                <TableCell><Badge variant="secondary">{r.menu_state ?? "—"}</Badge></TableCell>
                <TableCell>
                  <Badge variant={r.is_active ? "default" : "secondary"}>
                    {r.is_active ? "Active" : "Closed"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No USSD sessions match these filters.
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

      <UssdSessionDetailSheet session={openRow} open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)} />
    </div>
  );
}
