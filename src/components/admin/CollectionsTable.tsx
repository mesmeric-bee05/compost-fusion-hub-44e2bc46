import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type CollectionStatus = Database["public"]["Enums"]["collection_status"];

const statusColor: Record<CollectionStatus, string> = {
  requested: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  collected: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function CollectionsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Waste Type</TableHead>
            <TableHead>Volume (kg)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Driver</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">{c.id.slice(0, 8)}</TableCell>
              <TableCell>{format(new Date(c.pickup_date), "MMM d, yyyy")}</TableCell>
              <TableCell className="capitalize">{c.waste_type}</TableCell>
              <TableCell>{c.estimated_volume_kg ?? "—"}</TableCell>
              <TableCell>
                <Badge className={statusColor[c.status as CollectionStatus]}>{c.status}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{c.driver_id?.slice(0, 8) ?? "Unassigned"}</TableCell>
            </TableRow>
          ))}
          {!data?.length && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No collections yet</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
