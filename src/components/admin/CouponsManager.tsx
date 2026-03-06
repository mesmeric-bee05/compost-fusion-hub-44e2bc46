import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Ticket } from "lucide-react";
import { format } from "date-fns";

export default function CouponsManager() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCoupon = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coupons").insert({
        code: code.toUpperCase().trim(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_amount: minOrder ? Number(minOrder) : 0,
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Coupon created! 🎟️" });
      resetForm();
    },
    onError: (err) => toast({ title: "Failed", description: String(err), variant: "destructive" }),
  });

  const toggleCoupon = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Coupon deleted" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setCode("");
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinOrder("");
    setMaxUses("");
    setExpiresAt("");
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Coupon Codes</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" />{showForm ? "Cancel" : "New Coupon"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <Input placeholder="Code (e.g. SAVE20)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 20))} />
            <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value.slice(0, 100))} />
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed (KES)</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder={discountType === "percentage" ? "Discount %" : "Discount KES"} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
            <Input type="number" placeholder="Min order (KES)" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
            <Input type="number" placeholder="Max uses (empty = unlimited)" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            <Input type="datetime-local" placeholder="Expires at" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <Button
              onClick={() => createCoupon.mutate()}
              disabled={!code.trim() || !discountValue || createCoupon.isPending}
            >
              Create Coupon
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons?.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono font-medium text-foreground">{c.code}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `KES ${c.discount_value}`}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {c.min_order_amount ? `KES ${c.min_order_amount}` : "—"}
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {c.times_used}{c.max_uses ? ` / ${c.max_uses}` : ""}
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {c.expires_at ? format(new Date(c.expires_at), "MMM d, yyyy") : "Never"}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(v) => toggleCoupon.mutate({ id: c.id, active: v })}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCoupon.mutate(c.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!coupons?.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">No coupons yet</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
