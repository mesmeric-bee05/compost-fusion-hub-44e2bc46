import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function UsersTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) ?? []);
      return profiles.map((p) => ({ ...p, role: roleMap.get(p.user_id) ?? "unknown" }));
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
              <TableCell>{u.phone || "—"}</TableCell>
              <TableCell className="capitalize">{u.role}</TableCell>
              <TableCell>{u.location || "—"}</TableCell>
              <TableCell>{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
            </TableRow>
          ))}
          {!data?.length && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No users yet</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
