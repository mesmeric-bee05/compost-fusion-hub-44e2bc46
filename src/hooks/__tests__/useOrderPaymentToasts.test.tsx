import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOrderPaymentToasts } from "../useOrderPaymentToasts";
import type { PaymentSnapshot } from "../usePaymentStatus";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

const snap = (overrides: Partial<PaymentSnapshot> = {}): PaymentSnapshot => ({
  status: "pending",
  mpesa_receipt_number: null,
  result_description: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useOrderPaymentToasts", () => {
  it("fires an info toast on first pending observation", () => {
    renderHook(({ s }) => useOrderPaymentToasts("o1", s), {
      initialProps: { s: snap({ status: "pending" }) },
    });
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it("fires a success toast on pending → completed transition", () => {
    const { rerender } = renderHook(({ s }) => useOrderPaymentToasts("o1", s), {
      initialProps: { s: snap({ status: "pending" }) },
    });
    rerender({ s: snap({ status: "completed", mpesa_receipt_number: "ABC123" }) });
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect((toast.success as any).mock.calls[0][0]).toContain("Pending → Completed");
  });

  it("fires an error toast on pending → failed transition", () => {
    const { rerender } = renderHook(({ s }) => useOrderPaymentToasts("o1", s), {
      initialProps: { s: snap({ status: "pending" }) },
    });
    rerender({ s: snap({ status: "failed", result_description: "Insufficient balance" }) });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("does not toast twice for the same status", () => {
    const { rerender } = renderHook(({ s }) => useOrderPaymentToasts("o1", s), {
      initialProps: { s: snap({ status: "pending" }) },
    });
    rerender({ s: snap({ status: "pending" }) });
    rerender({ s: snap({ status: "pending" }) });
    expect(toast.info).toHaveBeenCalledTimes(1);
  });
});
