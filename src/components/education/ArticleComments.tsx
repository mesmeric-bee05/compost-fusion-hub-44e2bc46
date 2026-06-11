import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface Props {
  contentId: string;
}

interface Comment {
  id: string;
  content_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: { full_name: string } | null;
}

export default function ArticleComments({ contentId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["article_comments", contentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_comments")
        .select("*")
        .eq("content_id", contentId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch profile names for comment authors
      const userIds = [...new Set((data || []).map((c) => c.user_id))];
      if (!userIds.length) return [] as Comment[];

      const { data: profiles } = await supabase.rpc("get_public_profiles", { _user_ids: userIds });


      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return (data || []).map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) || null,
      })) as Comment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      const trimmed = body.trim();
      if (!trimmed || trimmed.length > 2000) throw new Error("Invalid comment");
      const { error } = await supabase
        .from("article_comments")
        .insert({ content_id: contentId, user_id: user.id, body: trimmed });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["article_comments", contentId] });
      toast.success("Comment posted!");
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("article_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article_comments", contentId] });
      toast.success("Comment deleted");
    },
  });

  return (
    <div className="border-t pt-4">
      <h4 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
        <MessageSquare className="h-4 w-4" />
        Comments ({comments.length})
      </h4>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {(c.profile?.full_name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {c.profile?.full_name || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                  {user?.id === c.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteComment.mutate(c.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          ))}

          {!comments.length && (
            <p className="text-center text-sm text-muted-foreground py-2">
              No comments yet. Be the first to share your thoughts!
            </p>
          )}
        </div>
      )}

      {user ? (
        <div className="mt-4 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts..."
            maxLength={2000}
            className="min-h-[80px]"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{body.length}/2000</span>
            <Button
              size="sm"
              onClick={() => addComment.mutate()}
              disabled={!body.trim() || addComment.isPending}
            >
              {addComment.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Post Comment
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary underline">Sign in</Link> to join the discussion.
        </p>
      )}
    </div>
  );
}
