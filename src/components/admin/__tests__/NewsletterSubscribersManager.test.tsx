import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NewsletterSubscribersManager from "../NewsletterSubscribersManager";

// --- Mock supabase client -------------------------------------------------
type Sub = { id: string; email: string; subscribed_at: string };

const mockState: {
  rows: Sub[];
  total: number;
  lastQuery: any;
  deleteIds: string[] | null;
  invokeCalls: { name: string; body: any }[];
  invokeImpl: (name: string, body: any) => any;
} = {
  rows: [],
  total: 0,
  lastQuery: {},
  deleteIds: null,
  invokeCalls: [],
  invokeImpl: () => ({ data: { ok: true }, error: null }),
};

function makeBuilder() {
  const q: any = { _filters: {} as any, _range: null as any, _delete: false, _ids: null as any };
  const ret = {
    select: vi.fn(() => ret),
    order: vi.fn(() => ret),
    ilike: vi.fn((_c: string, v: string) => { q._filters.ilike = v; return ret; }),
    gte: vi.fn((_c: string, v: string) => { q._filters.gte = v; return ret; }),
    lte: vi.fn((_c: string, v: string) => { q._filters.lte = v; return ret; }),
    range: vi.fn((s: number, e: number) => {
      q._range = [s, e];
      mockState.lastQuery = { ...q._filters, range: [s, e] };
      return Promise.resolve({ data: mockState.rows, count: mockState.total, error: null });
    }),
    delete: vi.fn(() => ret),
    in: vi.fn((_c: string, ids: string[]) => {
      mockState.deleteIds = ids;
      return Promise.resolve({ data: null, error: null });
    }),
    limit: vi.fn(() => ret),
  };
  return ret;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeBuilder()),
    functions: {
      invoke: vi.fn(async (name: string, opts: { body: any }) => {
        mockState.invokeCalls.push({ name, body: opts.body });
        return mockState.invokeImpl(name, opts.body);
      }),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

// --- Helpers --------------------------------------------------------------
const renderUI = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NewsletterSubscribersManager />
    </QueryClientProvider>,
  );
};

const sub = (i: number): Sub => ({
  id: `id-${i}`,
  email: `user${i}@example.com`,
  subscribed_at: new Date(2026, 0, i + 1).toISOString(),
});

beforeEach(() => {
  mockState.rows = Array.from({ length: 20 }, (_, i) => sub(i));
  mockState.total = 50;
  mockState.lastQuery = {};
  mockState.deleteIds = null;
  mockState.invokeCalls = [];
  mockState.invokeImpl = () => ({ data: { ok: true }, error: null });
});

describe("NewsletterSubscribersManager", () => {
  it("paginates with server-side range and disables Prev on first page", async () => {
    renderUI();
    await screen.findByText("user0@example.com");
    expect(mockState.lastQuery.range).toEqual([0, 19]);

    const prev = screen.getByRole("button", { name: /prev/i });
    expect(prev).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(mockState.lastQuery.range).toEqual([20, 39]));
  });

  it("applies search and date filters and resets to page 0", async () => {
    renderUI();
    await screen.findByText("user0@example.com");

    fireEvent.change(screen.getByPlaceholderText(/search email/i), { target: { value: "alice" } });
    await waitFor(() => expect(mockState.lastQuery.ilike).toBe("%alice%"), { timeout: 2000 });

    const allInputs = Array.from(document.querySelectorAll<HTMLInputElement>("input"));
    const dateInput = allInputs.find((i) => i.type === "date") ?? allInputs[1];
    fireEvent.change(dateInput, { target: { value: "2026-01-01" } });
    await waitFor(() => expect(mockState.lastQuery.gte).toBeTruthy(), { timeout: 2000 });
    expect(mockState.lastQuery.range).toEqual([0, 19]);
  });

  it("requires confirmation before bulk deleting selected subscribers", async () => {
    renderUI();
    await screen.findByText("user0@example.com");

    const checkboxes = screen.getAllByRole("checkbox", { name: /^Select user/ });
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[1]);

    await userEvent.click(screen.getByRole("button", { name: /delete 2/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/remove 2 subscribers/i)).toBeInTheDocument();

    // Cancel does NOT delete
    await userEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(mockState.deleteIds).toBeNull();

    // Reopen and confirm
    await userEvent.click(screen.getByRole("button", { name: /delete 2/i }));
    const dialog2 = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog2).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockState.deleteIds).toEqual(["id-0", "id-1"]);
    });
    // Audit log invoked
    await waitFor(() => {
      expect(mockState.invokeCalls.some((c) => c.name === "log-admin-action")).toBe(true);
    });
  });

  it("shows spinner and disables resend button while in flight", async () => {
    let resolve!: (v: any) => void;
    mockState.invokeImpl = (name) => {
      if (name === "send-newsletter-welcome") {
        return new Promise((r) => { resolve = r; });
      }
      return { data: { ok: true }, error: null };
    };
    renderUI();
    await screen.findByText("user0@example.com");

    const resendBtns = screen.getAllByRole("button", { name: /resend welcome email/i });
    await userEvent.click(resendBtns[0]);

    await waitFor(() => {
      const btn = screen.getAllByRole("button", { name: /sending welcome email|resend welcome email/i })[0];
      expect(btn).toHaveAttribute("aria-busy", "true");
      expect(btn).toBeDisabled();
    });

    resolve({ data: { ok: true }, error: null });
    await waitFor(() => {
      const btn = screen.getAllByRole("button", { name: /resend welcome email/i })[0];
      expect(btn).not.toBeDisabled();
    });
  });

  it("offers select-all-matching when total exceeds page and confirmation reflects total", async () => {
    renderUI();
    await screen.findByText("user0@example.com");

    // Select all on page via header checkbox
    await userEvent.click(screen.getByRole("checkbox", { name: /select all on page/i }));

    const banner = await screen.findByRole("status");
    const selectAll = within(banner).getByRole("button", { name: /select all 50 matching/i });
    await userEvent.click(selectAll);

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/all 50 matching subscribers selected/i),
    );

    await userEvent.click(screen.getByRole("button", { name: /delete 50/i }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/remove all 50 matching subscribers/i)).toBeInTheDocument();
  });
});
