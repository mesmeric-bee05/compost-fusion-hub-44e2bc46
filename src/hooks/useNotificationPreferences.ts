import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface NotificationPreferences {
  browser_order_updates: boolean;
  browser_collection_reminders: boolean;
  browser_reward_achievements: boolean;
  email_order_updates: boolean;
  email_collection_reminders: boolean;
  email_reward_achievements: boolean;
}

const DEFAULTS: NotificationPreferences = {
  browser_order_updates: true,
  browser_collection_reminders: true,
  browser_reward_achievements: true,
  email_order_updates: true,
  email_collection_reminders: true,
  email_reward_achievements: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: preferences = DEFAULTS, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      // Try to fetch existing prefs
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      // If no row exists, create one with defaults
      if (!data) {
        const { data: created, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user!.id })
          .select()
          .single();
        if (insertError) throw insertError;
        return created as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ["notification-preferences", user?.id] });
      const prev = qc.getQueryData(["notification-preferences", user?.id]);
      qc.setQueryData(["notification-preferences", user?.id], (old: NotificationPreferences) => ({
        ...old,
        ...updates,
      }));
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["notification-preferences", user?.id], context.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notification-preferences", user?.id] }),
  });

  // Helper to check if a notification type should show browser notification
  const shouldShowBrowser = (type: string): boolean => {
    switch (type) {
      case "order_update": return preferences.browser_order_updates;
      case "collection_reminder": return preferences.browser_collection_reminders;
      case "reward_achievement": return preferences.browser_reward_achievements;
      default: return true;
    }
  };

  return { preferences, isLoading, updatePreferences, shouldShowBrowser };
}
