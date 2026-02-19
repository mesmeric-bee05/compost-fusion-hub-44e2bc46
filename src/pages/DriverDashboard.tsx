import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin, Calendar, Trash2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type CollectionStatus = Database["public"]["Enums"]["collection_status"];

const statusColor: Record<CollectionStatus, string> = {
  requested: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  collected: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function DriverDashboard() {
  const { user, role, loading } = useAuth();
  const qc = useQueryClient();

  const { data: collections, isLoading } = useQuery({
    queryKey: ["driver-collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_requests")
        .select("*")
        .eq("driver_id", user!.id)
        .order("pickup_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markCollected = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("collection_requests")
        .update({ status: "collected" as CollectionStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-collections"] });
      toast({ title: "Marked as collected!" });
    },
  });

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (role !== "driver") return <Navigate to="/dashboard" replace />;

  const pending = collections?.filter((c) => c.status !== "collected" && c.status !== "cancelled") ?? [];
  const completed = collections?.filter((c) => c.status === "collected") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <h1 className="mb-2 font-display text-3xl font-bold">My Collection Tasks</h1>
        <p className="mb-6 text-muted-foreground">
          {pending.length} active · {completed.length} completed
        </p>

        {isLoading && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />}

        {!isLoading && !collections?.length && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No tasks assigned yet.</CardContent></Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections?.map((c) => (
            <Card key={c.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className={statusColor[c.status as CollectionStatus]}>{c.status}</Badge>
                  <span className="capitalize text-xs font-medium text-muted-foreground">{c.waste_type}</span>
                </div>
                <CardTitle className="text-base mt-2">{c.address}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(c.pickup_date), "MMM d, yyyy")}
                  {c.pickup_time && ` at ${c.pickup_time}`}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                  {c.estimated_volume_kg ? `${c.estimated_volume_kg} kg` : "Volume not specified"}
                </div>
                {c.notes && <p className="text-xs text-muted-foreground italic">"{c.notes}"</p>}

                {(c.status === "scheduled" || c.status === "requested") && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="mt-3 w-full" size="sm">
                        <CheckCircle2 className="mr-2 h-4 w-4" />Mark as Collected
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Collection</AlertDialogTitle>
                        <AlertDialogDescription>
                          Mark this pickup at "{c.address}" as collected? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => markCollected.mutate(c.id)}>
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
