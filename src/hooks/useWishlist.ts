import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export function useWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ["wishlist-ids", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((w) => w.product_id);
    },
    enabled: !!user,
  });

  const toggleWishlist = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Not authenticated");
      const isInWishlist = wishlistIds.includes(productId);
      if (isInWishlist) {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
        return { added: false };
      } else {
        const { error } = await supabase
          .from("wishlist")
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["wishlist-ids"] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      toast({ title: result.added ? "Added to wishlist ❤️" : "Removed from wishlist" });
    },
    onError: (err) => {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    },
  });

  return { wishlistIds, toggleWishlist: toggleWishlist.mutate, isToggling: toggleWishlist.isPending };
}
