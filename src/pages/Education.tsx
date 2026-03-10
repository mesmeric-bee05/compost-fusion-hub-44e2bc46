import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Loader2, Video, FileText, Search, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SocialShareButtons from "@/components/education/SocialShareButtons";

function getReadingTime(text: string | null): number {
  if (!text) return 1;
  const words = text.replace(/[#*_\[\]`>]/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

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
  const filtered = (content || []).filter((c) => {
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || c.title.toLowerCase().includes(q) || (c.body || "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

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

        {/* Search bar */}
        <div className="mb-6 flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search articles..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="mb-6 flex justify-center">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange("all")}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  size="sm"
                  className="capitalize"
                  onClick={() => handleCategoryChange(cat)}
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
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((c) => (
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
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{getReadingTime(c.body)} min read</span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {c.body?.replace(/[#*_\[\]`>]/g, "").slice(0, 150)}...
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Showing {paginated.length} of {filtered.length} articles
            </p>
          </>
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

          {selectedArticle && (
            <div className="border-t pt-4">
              <SocialShareButtons title={selectedArticle.title} slug={selectedArticle.slug} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
