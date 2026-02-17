import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2 } from "lucide-react";

export default function Education() {
  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("content").select("*").eq("is_published", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">Education Hub</h1>
          <p className="mt-2 text-muted-foreground">Learn about composting, recycling, and sustainable agriculture</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !content?.length ? (
          <div className="flex flex-col items-center py-20">
            <BookOpen className="h-16 w-16 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">Content coming soon!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {content.map(c => (
              <Card key={c.id} className="overflow-hidden">
                {c.image_url && <img src={c.image_url} alt={c.title} className="aspect-video w-full object-cover" />}
                <CardContent className="p-4">
                  <Badge variant="secondary" className="mb-2">{c.category}</Badge>
                  <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{c.body?.slice(0, 150)}...</p>
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
