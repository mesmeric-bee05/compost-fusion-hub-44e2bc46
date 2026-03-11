import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useBookmarks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["article_bookmarks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_bookmarks")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleBookmark = useMutation({
    mutationFn: async (contentId: string) => {
      if (!user) throw new Error("Must be logged in");
      const existing = bookmarks.find((b) => b.content_id === contentId);
      if (existing) {
        const { error } = await supabase
          .from("article_bookmarks")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return { action: "removed" as const };
      } else {
        const { error } = await supabase
          .from("article_bookmarks")
          .insert({ content_id: contentId, user_id: user.id });
        if (error) throw error;
        return { action: "added" as const };
      }
    },
    onSuccess: ({ action }) => {
      queryClient.invalidateQueries({ queryKey: ["article_bookmarks"] });
      toast.success(action === "added" ? "Article bookmarked!" : "Bookmark removed");
    },
    onError: () => toast.error("Failed to update bookmark"),
  });

  const isBookmarked = (contentId: string) =>
    bookmarks.some((b) => b.content_id === contentId);

  return { bookmarks, isLoading, toggleBookmark, isBookmarked };
}
