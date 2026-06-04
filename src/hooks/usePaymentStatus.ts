import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentRowStatus = "pending" | "completed" | "failed";

export interface PaymentSnapshot {
  status: PaymentRowStatus;
  mpesa_receipt_number: string | null;
  result_description: string | null;
}

/**
 * Subscribe to a single order's latest payment row via Supabase Realtime,
 * with a polling fallback (every 4s) if the channel doesn't connect within 5s
 * or the realtime feed is dropped.
 *
 * Returns `null` until a payment row is first observed.
 */
export function usePaymentStatus(orderId: string | null | undefined): PaymentSnapshot | null {
  const [snapshot, setSnapshot] = useState<PaymentSnapshot | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    const fetchOnce = async () => {
      const { data } = await supabase
        .from("payments")
        .select("status, mpesa_receipt_number, result_description")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setSnapshot(data as PaymentSnapshot);
    };

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(fetchOnce, 4000);
    };

    // Initial fetch (covers the case where the row already exists)
    fetchOnce();

    const channel = supabase
      .channel(`payment-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments", filter: `order_id=eq.${orderId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<PaymentSnapshot> | undefined;
          if (row?.status) setSnapshot(row as PaymentSnapshot);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          startPolling();
        }
      });

    // If we don't subscribe within 5s, start polling as a safety net.
    fallbackTimer.current = setTimeout(startPolling, 5000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      pollRef.current = null;
      fallbackTimer.current = null;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return snapshot;
}
