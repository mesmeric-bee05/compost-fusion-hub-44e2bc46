import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { shouldShowBrowser } = useNotificationPreferences();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Request browser notification permission on mount
  useEffect(() => {
    if (!user) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [user]);

  // Realtime subscription + browser push (respects preferences)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });

          const n = payload.new as Notification;

          // Check user's browser notification preferences
          if (
            "Notification" in window &&
            Notification.permission === "granted" &&
            shouldShowBrowser(n.type)
          ) {
            const browserNotif = new window.Notification(n.title, {
              body: n.message || undefined,
              icon: "/favicon.ico",
              tag: n.id,
            });
            browserNotif.onclick = () => {
              window.focus();
              if (n.link) window.location.href = n.link;
              browserNotif.close();
            };
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc, shouldShowBrowser]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead };
}
