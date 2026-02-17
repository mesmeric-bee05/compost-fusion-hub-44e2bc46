import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Plus, User } from "lucide-react";

export default function Community() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["forum_posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("forum_posts").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createPost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("forum_posts").insert({ user_id: user.id, title, body });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum_posts"] });
      setTitle(""); setBody(""); setShowForm(false);
      toast({ title: "Post created!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Community</h1>
            <p className="text-muted-foreground">Connect with fellow composters and recyclers</p>
          </div>
          {user && <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" />New Post</Button>}
        </div>
        {showForm && (
          <Card className="mb-6">
            <CardContent className="space-y-4 p-4">
              <Input placeholder="Post title" value={title} onChange={e => setTitle(e.target.value)} />
              <Textarea placeholder="What's on your mind?" value={body} onChange={e => setBody(e.target.value)} rows={4} />
              <div className="flex gap-2">
                <Button onClick={() => createPost.mutate()} disabled={!title.trim() || !body.trim() || createPost.isPending}>
                  {createPost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Post
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !posts?.length ? (
          <div className="flex flex-col items-center py-20">
            <MessageSquare className="h-16 w-16 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">No posts yet. Start a conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {p.is_pinned && <Badge>Pinned</Badge>}
                        <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
                    </div>
                    <Badge variant="secondary">{p.category}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
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
