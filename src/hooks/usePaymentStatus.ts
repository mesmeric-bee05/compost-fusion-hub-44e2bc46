import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentRowStatus = "pending" | "completed" | "failed";
export type RealtimeTransport = "connecting" | "realtime" | "polling" | "disconnected";

export interface PaymentSnapshot {
  status: PaymentRowStatus;
  mpesa_receipt_number: string | null;
  result_description: string | null;
}

export interface PaymentStatusResult {
  snapshot: PaymentSnapshot | null;
  previousStatus: PaymentRowStatus | null;
  transport: RealtimeTransport;
  reconnect: () => void;
}

/**
 * Subscribe to a single order's latest payment row via Supabase Realtime,
 * with a polling fallback (every 4s) if the channel can't connect within 5s
 * or the realtime feed drops. Exposes the current transport and the previous
 * status so consumers can drive transition UI (toasts, badges, etc.).
 */
export function usePaymentStatus(orderId: string | null | undefined): PaymentStatusResult {
  const [snapshot, setSnapshot] = useState<PaymentSnapshot | null>(null);
  const [previousStatus, setPreviousStatus] = useState<PaymentRowStatus | null>(null);
  const [transport, setTransport] = useState<RealtimeTransport>("connecting");
  const [reconnectKey, setReconnectKey] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStatusRef = useRef<PaymentRowStatus | null>(null);

  const reconnect = useCallback(() => setReconnectKey((k) => k + 1), []);

  const updateSnapshot = useCallback((row: PaymentSnapshot) => {
    setSnapshot((prev) => {
      if (prev && prev.status !== row.status) {
        setPreviousStatus(prev.status);
      }
      lastStatusRef.current = row.status;
      return row;
    });
  }, []);

  useEffect(() => {
    if (!orderId) {
      setTransport("disconnected");
      return;
    }
    let cancelled = false;
    setTransport("connecting");

    const fetchOnce = async () => {
      const { data } = await supabase
        .from("payments")
        .select("status, mpesa_receipt_number, result_description")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) updateSnapshot(data as PaymentSnapshot);
    };

    const startPolling = () => {
      if (pollRef.current) return;
      setTransport("polling");
      pollRef.current = setInterval(fetchOnce, 4000);
    };

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    fetchOnce();

    const channel = supabase
      .channel(`payment-${orderId}-${reconnectKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments", filter: `order_id=eq.${orderId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<PaymentSnapshot> | undefined;
          if (row?.status) updateSnapshot(row as PaymentSnapshot);
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
          stopPolling();
          setTransport("realtime");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          startPolling();
        }
      });

    // Safety net: if we haven't subscribed within 5s, start polling.
    fallbackTimer.current = setTimeout(() => {
      if (!cancelled) startPolling();
    }, 5000);

    return () => {
      cancelled = true;
      stopPolling();
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
      supabase.removeChannel(channel);
    };
  }, [orderId, reconnectKey, updateSnapshot]);

  return { snapshot, previousStatus, transport, reconnect };
}
