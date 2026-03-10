import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MarkdownEditor from "@/components/admin/MarkdownEditor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, FileText, Video, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ImageUpload from "@/components/admin/ImageUpload";

const categories = ["composting", "recycling", "agriculture", "sustainability", "tips"] as const;
const contentTypes = [
  { value: "article", label: "Article", icon: FileText },
  { value: "guide", label: "Guide", icon: BookOpen },
  { value: "video", label: "Video", icon: Video },
] as const;

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  body: string | null;
  category: string;
  content_type: string;
  image_url: string | null;
  video_url: string | null;
  is_published: boolean;
  language: string;
  created_at: string;
  updated_at: string;
  author_id: string | null;
}

const emptyForm = {
  title: "",
  slug: "",
  body: "",
  category: "composting",
  content_type: "article",
  image_url: "",
  video_url: "",
  is_published: false,
  language: "en",
};

export default function ContentManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<string>("all");

  const { data: content = [], isLoading } = useQuery({
    queryKey: ["admin-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContentItem[];
    },
  });

  const filtered = filter === "all" ? content : content.filter((c) => c.category === filter);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const payload = {
        title: form.title.trim(),
        slug,
        body: form.body || null,
        category: form.category,
        content_type: form.content_type,
        image_url: form.image_url || null,
        video_url: form.video_url || null,
        is_published: form.is_published,
        language: form.language,
        author_id: user?.id || null,
      };

      if (editingId) {
        const { error } = await supabase.from("content").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("content").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      qc.invalidateQueries({ queryKey: ["content"] });
      toast({ title: editingId ? "Content updated" : "Content created" });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      qc.invalidateQueries({ queryKey: ["content"] });
      toast({ title: "Content deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("content").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      qc.invalidateQueries({ queryKey: ["content"] });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      body: item.body || "",
      category: item.category,
      content_type: item.content_type,
      image_url: item.image_url || "",
      video_url: item.video_url || "",
      is_published: item.is_published,
      language: item.language,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const updateField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Content
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-muted-foreground">No content yet. Create your first article!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{item.content_type}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1"
                      onClick={() => togglePublish.mutate({ id: item.id, published: !item.is_published })}
                    >
                      {item.is_published ? (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                          <Eye className="mr-1 h-3 w-3" /> Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="mr-1 h-3 w-3" /> Draft
                        </Badge>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this content?")) deleteMutation.mutate(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Content" : "Create New Content"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="How to Start Composting at Home" />
            </div>
            <div>
              <Label>Slug (auto-generated if empty)</Label>
              <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} placeholder="how-to-start-composting" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Content Type</Label>
                <Select value={form.content_type} onValueChange={(v) => updateField("content_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2"><t.icon className="h-4 w-4" /> {t.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Body / Content (Markdown supported)</Label>
              <MarkdownEditor
                value={form.body}
                onChange={(v) => updateField("body", v)}
                placeholder="Write your article content using Markdown..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Image URL (optional)</Label>
                <Input value={form.image_url} onChange={(e) => updateField("image_url", e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>Video URL (optional)</Label>
                <Input value={form.video_url} onChange={(e) => updateField("video_url", e.target.value)} placeholder="https://youtube.com/..." />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_published} onCheckedChange={(v) => updateField("is_published", v)} />
              <Label>Publish immediately</Label>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.title.trim() || saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Save Changes" : "Create Content"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
