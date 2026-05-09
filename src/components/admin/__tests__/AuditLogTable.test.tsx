import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuditLogTable from "../AuditLogTable";

type Row = {
  id: string;
  admin_id: string;
  action: string;
  target_count: number;
  target_emails: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  total_count: number;
};

const state: {
  rows: Row[];
  total: number;
  lastSearchArgs: Record<string, unknown> | null;
  rpcImpl: (name: string, args: any) => any;
  fetchImpl: (url: string, init: RequestInit) => Promise<Response>;
} = {
  rows: [],
  total: 0,
  lastSearchArgs: null,
  rpcImpl: () => ({ data: [], error: null }),
  fetchImpl: async () =>
    new Response("email,when\nx@y.com,2026-01-01", {
      status: 200,
      headers: { "X-Export-Count": "1", "Content-Type": "text/csv" },
    }),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async (name: string, args: any) => {
      if (name === "search_audit_log") state.lastSearchArgs = args;
      return state.rpcImpl(name, args);
    }),
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "test-token" } },
      })),
    },
  },
}));

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (x: unknown) => toastMock(x) }));

const row = (i: number, overrides: Partial<Row> = {}): Row => ({
  id: `row-${i}`,
  admin_id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
  action: "newsletter.resend",
  target_count: 1,
  target_emails: [`user${i}@example.com`],
  metadata: { count: 1 },
  created_at: new Date(2026, 0, i + 1).toISOString(),
  total_count: state.total,
  ...overrides,
});

beforeEach(() => {
  state.rows = Array.from({ length: 25 }, (_, i) => row(i));
  state.total = 60;
  state.rows = state.rows.map((r) => ({ ...r, total_count: state.total }));
  state.lastSearchArgs = null;
  state.rpcImpl = (name: string) => {
    if (name === "search_audit_log") return { data: state.rows, error: null };
    if (name === "get_audit_admin_names")
      return { data: [{ user_id: state.rows[0].admin_id, full_name: "Alice Admin" }], error: null };
    return { data: [], error: null };
  };
  state.fetchImpl = async () =>
    new Response("ok", { status: 200, headers: { "X-Export-Count": "60" } });
  toastMock.mockClear();
  (global as unknown as { fetch: unknown }).fetch = vi.fn(
    (url: string, init: RequestInit) => state.fetchImpl(url, init),
  );
  if (!global.URL.createObjectURL) {
    (global.URL as unknown as { createObjectURL: () => string }).createObjectURL = () => "blob:test";
  }
  if (!global.URL.revokeObjectURL) {
    (global.URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
  }
  HTMLAnchorElement.prototype.click = vi.fn();
});

const renderUI = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuditLogTable />
    </QueryClientProvider>,
  );
};

describe("AuditLogTable", () => {
  it("contains mode (default): types substring → rpc fires with _email_query and _mode='contains'", async () => {
    renderUI();
    await screen.findByText("user0@example.com");

    const input = screen.getByLabelText(/partial email search/i);
    fireEvent.change(input, { target: { value: "alice" } });

    await waitFor(
      () =>
        expect(state.lastSearchArgs).toMatchObject({
          _mode: "contains",
          _email_query: "alice",
          _emails: null,
          _offset: 0,
        }),
      { timeout: 2000 },
    );
  });

  it("multi-exact mode: pills are built from comma-separated input and rpc receives _emails", async () => {
    renderUI();
    await screen.findByText("user0@example.com");

    await userEvent.click(screen.getByRole("tab", { name: /multi-exact/i }));

    const input = screen.getByLabelText(/multi email exact match/i);
    fireEvent.change(input, { target: { value: "a@x.com, b@y.com" } });

    await screen.findByText("a@x.com");
    await screen.findByText("b@y.com");

    await waitFor(
      () =>
        expect(state.lastSearchArgs).toMatchObject({
          _mode: "multi-exact",
          _emails: ["a@x.com", "b@y.com"],
          _email_query: null,
        }),
      { timeout: 2000 },
    );
  });

  it("invalid email is shown as an invalid pill and is not sent to rpc", async () => {
    renderUI();
    await screen.findByText("user0@example.com");

    await userEvent.click(screen.getByRole("tab", { name: /multi-exact/i }));

    const input = screen.getByLabelText(/multi email exact match/i);
    fireEvent.change(input, { target: { value: "not-an-email, ok@ok.com" } });

    await screen.findByText(/not-an-email \(invalid\)/i);
    await screen.findByText("ok@ok.com");
    expect(screen.getByText(/1 valid · 1 invalid/i)).toBeInTheDocument();

    await waitFor(() => {
      const sent = state.lastSearchArgs?._emails as string[] | null;
      expect(sent).toEqual(["ok@ok.com"]);
    });
  });

  it("pagination: Prev disabled on page 1; Next advances offset; both disabled when total ≤ page size", async () => {
    renderUI();
    await screen.findByText("user0@example.com");

    const prev = screen.getByRole("button", { name: /prev/i });
    const next = screen.getByRole("button", { name: /next/i });
    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();

    await userEvent.click(next);
    await waitFor(() => expect(state.lastSearchArgs).toMatchObject({ _offset: 25 }));

    // Now simulate small dataset
    state.total = 10;
    state.rows = Array.from({ length: 10 }, (_, i) => row(i, { total_count: 10 }));
    // Trigger refetch by changing filter
    fireEvent.change(screen.getByLabelText(/partial email search/i), { target: { value: "x" } });
    await waitFor(() => {
      const p = screen.getByRole("button", { name: /prev/i });
      const n = screen.getByRole("button", { name: /next/i });
      expect(p).toBeDisabled();
      expect(n).toBeDisabled();
    }, { timeout: 2000 });
  });

  it("export: 429 response surfaces a 'Rate limited' toast", async () => {
    state.fetchImpl = async () =>
      new Response(JSON.stringify({ error: { code: "throttled", retry_after: 42 } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    renderUI();
    await screen.findByText("user0@example.com");

    await userEvent.click(screen.getByRole("button", { name: /export filtered csv/i }));

    await waitFor(() => {
      const calls = toastMock.mock.calls.flat();
      expect(calls.some((c) => /rate limited/i.test(c?.title ?? ""))).toBe(true);
    });
  });

  it("row click opens detail sheet with metadata", async () => {
    renderUI();
    await screen.findByText("user0@example.com");
    const rows = screen.getAllByTestId("audit-log-row");
    await userEvent.click(rows[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/newsletter\.resend/i)).toBeInTheDocument();
  });
});
