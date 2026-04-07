import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import ImageUpload from "./ImageUpload";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type Product = Tables<"products">;

const CATEGORIES = [
  { value: "composters", label: "Composters" },
  { value: "compost", label: "Compost" },
  { value: "recycling", label: "Recycling" },
  { value: "services", label: "Services" },
  { value: "industrial", label: "Industrial" },
  { value: "subscriptions", label: "Subscriptions" },
];

const emptyForm = {
  name: "",
  slug: "",
  short_description: "",
  description: "",
  category: "composters",
  price: 0,
  currency: "KES",
  stock_quantity: 0,
  image_url: "",
  bulk_discount_percent: 0,
  is_active: true,
  specifications: "{}",
};

export default function ProductsManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      let specs: Record<string, string | number | boolean | null> = {};
      try { specs = JSON.parse(form.specifications); } catch { /* keep empty */ }

      const payload: TablesInsert<"products"> | TablesUpdate<"products"> = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        short_description: form.short_description || null,
        description: form.description || null,
        category: form.category,
        price: Number(form.price),
        currency: form.currency,
        stock_quantity: Number(form.stock_quantity),
        image_url: form.image_url || null,
        bulk_discount_percent: Number(form.bulk_discount_percent) || 0,
        is_active: form.is_active,
        specifications: specs,
      };

      if (editId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload as TablesInsert<"products">);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: editId ? "Product updated" : "Product created" });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      short_description: p.short_description || "",
      description: p.description || "",
      category: p.category,
      price: p.price,
      currency: p.currency,
      stock_quantity: p.stock_quantity,
      image_url: p.image_url || "",
      bulk_discount_percent: p.bulk_discount_percent || 0,
      is_active: p.is_active,
      specifications: JSON.stringify(p.specifications || {}, null, 2),
    });
    setOpen(true);
  };
  const closeDialog = () => { setOpen(false); setEditId(null); };

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Products ({products?.length ?? 0})</h2>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Product</Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                <TableCell>{p.currency} {p.price.toLocaleString()}</TableCell>
                <TableCell>{p.stock_quantity}</TableCell>
                <TableCell>{p.is_active ? "✅" : "❌"}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, slug: editId ? form.slug : autoSlug(e.target.value) }); }} required />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </div>
            </div>

            <div>
              <Label>Short Description</Label>
              <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
            </div>

            <div>
              <Label>Full Description</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price ({form.currency})</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
              </div>
              <div>
                <Label>Stock Quantity</Label>
                <Input type="number" min={0} value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Bulk Discount %</Label>
                <Input type="number" min={0} max={100} value={form.bulk_discount_percent} onChange={(e) => setForm({ ...form, bulk_discount_percent: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>

            <div>
              <Label>Product Image</Label>
              <ImageUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} bucket="product-images" />
            </div>

            <div>
              <Label>Specifications (JSON)</Label>
              <Textarea rows={3} value={form.specifications} onChange={(e) => setForm({ ...form, specifications: e.target.value })} className="font-mono text-xs" />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editId ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
