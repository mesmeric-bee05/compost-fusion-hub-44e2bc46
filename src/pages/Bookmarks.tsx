import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBookmarks } from "@/hooks/useBookmarks";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2, Clock, BookOpen } from "lucide-react";

function getReadingTime(text: string | null): number {
  if (!text) return 1;
  const words = text.replace(/[#*_\[\]`>]/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function Bookmarks() {
  const { bookmarks, isLoading: bookmarksLoading, toggleBookmark } = useBookmarks();

  const contentIds = bookmarks.map((b) => b.content_id);

  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["bookmarked_articles", contentIds],
    enabled: contentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .in("id", contentIds)
        .eq("is_published", true);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = bookmarksLoading || articlesLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Saved Articles</h1>
          <p className="mt-2 text-muted-foreground">Your bookmarked educational content</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !articles.length ? (
          <div className="flex flex-col items-center py-20">
            <BookOpen className="h-16 w-16 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">No saved articles yet.</p>
            <Button variant="outline" className="mt-4" asChild>
              <a href="/education">Browse Education Hub</a>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                {c.image_url && (
                  <img src={c.image_url} alt={c.title} className="aspect-video w-full object-cover" />
                )}
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{c.category}</Badge>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{c.title}</h3>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{getReadingTime(c.body)} min read</span>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBookmark.mutate(c.id)}
                    >
                      <Bookmark className="mr-1 h-4 w-4 fill-primary text-primary" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
