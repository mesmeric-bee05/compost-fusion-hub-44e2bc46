import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;

export function useProducts(category?: string, search?: string) {
  return useQuery({
    queryKey: ["products", category, search],
    queryFn: async () => {
      let query = supabase.from("products").select("*").eq("is_active", true);
      if (category && category !== "all") query = query.eq("category", category);
      if (search) query = query.ilike("name", `%${search}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!slug,
  });
}
