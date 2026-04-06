import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from "@/components/admin/ImageUpload";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Package } from "lucide-react";

interface BundleItemDraft {
  product_id: string;
  quantity: number;
}

export default function BundlesManager() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<BundleItemDraft[]>([]);

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["admin-bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_bundles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch item counts
      const ids = (data || []).map((b) => b.id);
      if (!ids.length) return (data || []).map((b) => ({ ...b, itemCount: 0 }));

      const { data: bi } = await supabase
        .from("bundle_items")
        .select("bundle_id")
        .in("bundle_id", ids);

      const counts: Record<string, number> = {};
      (bi || []).forEach((i) => { counts[i.bundle_id] = (counts[i.bundle_id] || 0) + 1; });

      return (data || []).map((b) => ({ ...b, itemCount: counts[b.id] || 0 }));
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, currency")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const resetForm = () => {
    setName(""); setDescription(""); setDiscountPercent("10");
    setImageUrl(""); setIsActive(true); setItems([]);
    setEditingId(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = async (bundleId: string) => {
    const bundle = bundles?.find((b) => b.id === bundleId);
    if (!bundle) return;
    setEditingId(bundleId);
    setName(bundle.name);
    setDescription(bundle.description || "");
    setDiscountPercent(String(bundle.discount_percent));
    setImageUrl(bundle.image_url || "");
    setIsActive(bundle.is_active);

    const { data } = await supabase
      .from("bundle_items")
      .select("product_id, quantity")
      .eq("bundle_id", bundleId);
    setItems((data || []).map((i) => ({ product_id: i.product_id, quantity: i.quantity })));
    setDialogOpen(true);
  };

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = slugify(name);
      if (!name.trim()) throw new Error("Name is required");

      const payload = {
        name: name.trim(),
        slug,
        description: description.trim() || null,
        discount_percent: Number(discountPercent),
        image_url: imageUrl || null,
        is_active: isActive,
      };

      let bundleId = editingId;
      if (editingId) {
        const { error } = await supabase.from("product_bundles").update(payload).eq("id", editingId);
        if (error) throw error;
        // Replace items
        await supabase.from("bundle_items").delete().eq("bundle_id", editingId);
      } else {
        const { data, error } = await supabase.from("product_bundles").insert(payload).select("id").single();
        if (error) throw error;
        bundleId = data.id;
      }

      if (items.length && bundleId) {
        const { error } = await supabase.from("bundle_items").insert(
          items.map((i) => ({ bundle_id: bundleId!, product_id: i.product_id, quantity: i.quantity }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bundles"] });
      qc.invalidateQueries({ queryKey: ["bundles"] });
      toast({ title: editingId ? "Bundle updated" : "Bundle created" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bundles"] });
      qc.invalidateQueries({ queryKey: ["bundles"] });
      toast({ title: "Bundle deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("product_bundles").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bundles"] });
      qc.invalidateQueries({ queryKey: ["bundles"] });
    },
  });

  const addItem = () => {
    if (!products?.length) return;
    const unused = products.find((p) => !items.some((i) => i.product_id === p.id));
    if (unused) setItems([...items, { product_id: unused.id, quantity: 1 }]);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof BundleItemDraft, val: string) => {
    const next = [...items];
    if (field === "quantity") next[idx].quantity = Math.max(1, Number(val));
    else next[idx].product_id = val;
    setItems(next);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" /> Product Bundles
        </CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Bundle
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !bundles?.length ? (
          <p className="text-muted-foreground text-center py-8">No bundles yet. Create your first bundle.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundles.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell><Badge variant="secondary">{b.discount_percent}%</Badge></TableCell>
                  <TableCell>{b.itemCount} products</TableCell>
                  <TableCell>
                    <Switch
                      checked={b.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: b.id, active: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(b.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => { if (confirm("Delete this bundle?")) deleteMutation.mutate(b.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Bundle" : "Create Bundle"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update bundle details and items." : "Create a new product bundle with discounted pricing."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home Starter Kit" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount %</Label>
                <Input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Label>Active</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
            <div>
              <Label>Image</Label>
              <ImageUpload value={imageUrl} onChange={setImageUrl} bucket="product-images" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Bundle Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" /> Add Product
                </Button>
              </div>
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">No products added yet.</p>
              )}
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center mb-2">
                  <Select value={item.product_id} onValueChange={(v) => updateItem(idx, "product_id", v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {p.currency} {p.price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    className="w-20"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              disabled={saveMutation.isPending || !name.trim()}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : editingId ? "Update Bundle" : "Create Bundle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
