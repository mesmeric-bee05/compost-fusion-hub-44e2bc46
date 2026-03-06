import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Star, Upload, Loader2, Trash2, User } from "lucide-react";
import { format } from "date-fns";

interface Props {
  productId: string;
}

export default function ProductReviews({ productId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get reviewer profiles
  const reviewerIds = [...new Set(reviews?.map((r) => r.user_id) ?? [])];
  const { data: profiles } = useQuery({
    queryKey: ["reviewer-profiles", reviewerIds],
    queryFn: async () => {
      if (!reviewerIds.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", reviewerIds);
      return data ?? [];
    },
    enabled: reviewerIds.length > 0,
  });

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

  // Check if user already reviewed
  const userReview = reviews?.find((r) => r.user_id === user?.id);

  // Check if user has purchased this product
  const { data: hasPurchased } = useQuery({
    queryKey: ["has-purchased", productId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("id, orders!inner(user_id, status)")
        .eq("product_id", productId)
        .eq("orders.user_id", user!.id)
        .in("orders.status", ["confirmed", "shipped", "delivered"])
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user,
  });

  const submitReview = async () => {
    if (!user) return;
    setSubmitting(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${productId}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("review-images")
        .upload(path, imageFile, { contentType: imageFile.type });
      if (uploadErr) {
        toast({ title: "Image upload failed", description: uploadErr.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("review-images").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("product_reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
      image_url: imageUrl,
    });

    if (error) {
      toast({ title: "Review failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review submitted! 🌿" });
      setComment("");
      setRating(5);
      setImageFile(null);
      qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
    }
    setSubmitting(false);
  };

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from("product_reviews").delete().eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
      toast({ title: "Review deleted" });
    },
  });

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="mt-10 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">
          Customer Reviews {reviews?.length ? `(${reviews.length})` : ""}
        </h2>
        {avgRating && (
          <div className="flex items-center gap-1.5">
            <Star className="h-5 w-5 fill-secondary text-secondary" />
            <span className="font-display text-lg font-bold text-foreground">{avgRating}</span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
        )}
      </div>

      {/* Review Form */}
      {user && !userReview && hasPurchased && (
        <Card>
          <CardHeader><CardTitle className="text-base">Write a Review</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 ${
                      s <= (hoverRating || rating)
                        ? "fill-secondary text-secondary"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
            </div>
            <Textarea
              placeholder="Share your experience with this product…"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              rows={3}
            />
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Upload className="h-4 w-4" />
                {imageFile ? imageFile.name : "Add Photo"}
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 5 * 1024 * 1024) {
                      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
                      return;
                    }
                    setImageFile(f ?? null);
                  }}
                />
              </label>
              {imageFile && (
                <Button variant="ghost" size="sm" onClick={() => setImageFile(null)}>
                  <Trash2 className="h-3 w-3 mr-1" />Remove
                </Button>
              )}
            </div>
            <Button onClick={submitReview} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Review
            </Button>
          </CardContent>
        </Card>
      )}

      {user && !hasPurchased && !userReview && (
        <p className="text-sm text-muted-foreground italic">Purchase this product to leave a review.</p>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : reviews?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {reviews?.map((review) => {
            const profile = profileMap.get(review.user_id);
            return (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} className="h-full w-full rounded-full object-cover" alt="" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {profile?.full_name || "Anonymous"}
                        </p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${
                                s <= review.rating ? "fill-secondary text-secondary" : "text-muted-foreground/20"
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {format(new Date(review.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.user_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteReview.mutate(review.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {review.comment && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                  )}
                  {(review as any).image_url && (
                    <img
                      src={(review as any).image_url}
                      alt="Review"
                      className="mt-3 max-h-48 rounded-lg object-cover"
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
