import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BundleItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    image_url: string | null;
    slug: string;
  };
}

export interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
  items: BundleItem[];
  originalTotal: number;
  discountedTotal: number;
}

export function useBundles() {
  return useQuery({
    queryKey: ["bundles"],
    queryFn: async () => {
      const { data: bundles, error } = await supabase
        .from("product_bundles")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!bundles?.length) return [] as Bundle[];

      const bundleIds = bundles.map((b) => b.id);
      const { data: items, error: itemsError } = await supabase
        .from("bundle_items")
        .select("id, bundle_id, quantity, product_id")
        .in("bundle_id", bundleIds);

      if (itemsError) throw itemsError;

      const productIds = [...new Set((items || []).map((i) => i.product_id))];
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("id, name, price, currency, image_url, slug")
        .in("id", productIds);

      if (prodError) throw prodError;

      const productMap = Object.fromEntries((products || []).map((p) => [p.id, p]));

      return bundles.map((b) => {
        const bundleItems: BundleItem[] = (items || [])
          .filter((i) => i.bundle_id === b.id)
          .map((i) => ({
            id: i.id,
            quantity: i.quantity,
            product: productMap[i.product_id],
          }))
          .filter((i) => i.product);

        const originalTotal = bundleItems.reduce(
          (sum, i) => sum + i.product.price * i.quantity,
          0
        );
        const discountedTotal = Math.round(originalTotal * (1 - b.discount_percent / 100));

        return {
          ...b,
          items: bundleItems,
          originalTotal,
          discountedTotal,
        } as Bundle;
      });
    },
  });
}
