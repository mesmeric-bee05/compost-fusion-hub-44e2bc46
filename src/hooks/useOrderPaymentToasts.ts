import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { PaymentSnapshot, PaymentRowStatus } from "./usePaymentStatus";

const STATUS_LABEL: Record<PaymentRowStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
};

/**
 * Watches a payment snapshot stream and fires sonner toasts on status
 * transitions only (no duplicates). Safe to mount in multiple places —
 * the ref guard ensures each terminal state toasts at most once per order.
 */
export function useOrderPaymentToasts(
  orderId: string | null | undefined,
  snapshot: PaymentSnapshot | null,
) {
  const lastStatusRef = useRef<PaymentRowStatus | null>(null);
  const seenOrderRef = useRef<string | null>(null);

  useEffect(() => {
    if (orderId && seenOrderRef.current !== orderId) {
      seenOrderRef.current = orderId;
      lastStatusRef.current = null;
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !snapshot) return;
    const prev = lastStatusRef.current;
    const next = snapshot.status;
    if (prev === next) return;

    const transitionLabel = prev
      ? `${STATUS_LABEL[prev]} → ${STATUS_LABEL[next]}`
      : STATUS_LABEL[next];

    if (next === "pending" && prev === null) {
      toast.info("Awaiting M-Pesa confirmation…", {
        description: "Check your phone for the STK prompt.",
      });
    } else if (next === "completed") {
      toast.success(`Payment ${transitionLabel}`, {
        description: snapshot.mpesa_receipt_number
          ? `Receipt: ${snapshot.mpesa_receipt_number}`
          : "Order confirmed.",
      });
    } else if (next === "failed") {
      toast.error(`Payment ${transitionLabel}`, {
        description: snapshot.result_description || "Please try again from your cart.",
      });
    }

    lastStatusRef.current = next;
  }, [orderId, snapshot]);
}
