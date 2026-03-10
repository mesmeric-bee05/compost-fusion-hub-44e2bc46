import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2, ArrowLeft, Video, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  body: string | null;
  category: string;
  content_type: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
}

export default function Education() {
  const [selectedArticle, setSelectedArticle] = useState<ContentItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContentItem[];
    },
  });

  const categories = [...new Set((content || []).map((c) => c.category))];
  const filtered = categoryFilter === "all" ? content : content?.filter((c) => c.category === categoryFilter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Education Hub</h1>
          <p className="mt-2 text-muted-foreground">
            Learn about composting, recycling, and sustainable agriculture
          </p>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="mb-6 flex justify-center">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("all")}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  size="sm"
                  className="capitalize"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !filtered?.length ? (
          <div className="flex flex-col items-center py-20">
            <BookOpen className="h-16 w-16 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">Content coming soon!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                onClick={() => setSelectedArticle(c)}
              >
                {c.image_url && (
                  <img src={c.image_url} alt={c.title} className="aspect-video w-full object-cover" />
                )}
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{c.category}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {c.content_type === "video" ? (
                        <><Video className="mr-1 h-3 w-3" /> Video</>
                      ) : (
                        <><FileText className="mr-1 h-3 w-3" /> {c.content_type}</>
                      )}
                    </Badge>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{c.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {c.body?.replace(/[#*_\[\]`>]/g, "").slice(0, 150)}...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Article Reader Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">{selectedArticle?.category}</Badge>
              <Badge variant="outline" className="capitalize">{selectedArticle?.content_type}</Badge>
            </div>
            <DialogTitle className="font-display text-2xl">{selectedArticle?.title}</DialogTitle>
          </DialogHeader>

          {selectedArticle?.image_url && (
            <img
              src={selectedArticle.image_url}
              alt={selectedArticle.title}
              className="w-full rounded-lg object-cover"
              style={{ maxHeight: "300px" }}
            />
          )}

          {selectedArticle?.video_url && (
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe
                src={selectedArticle.video_url.replace("watch?v=", "embed/")}
                className="h-full w-full"
                allowFullScreen
                title={selectedArticle.title}
              />
            </div>
          )}

          {selectedArticle?.body && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedArticle.body}</ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
