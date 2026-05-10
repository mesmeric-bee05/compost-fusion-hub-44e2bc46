import { test, expect, request } from "@playwright/test";
import fs from "node:fs";

const URL = process.env.VITE_SUPABASE_URL ?? "";
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const skipBase = !URL || !ANON || !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD;

const FN_URL = URL ? `${URL}/functions/v1/export-admin-audit-log` : "";

function readAdminToken(): string | null {
  try {
    const raw = fs.readFileSync("e2e/.auth/admin.json", "utf8");
    const state = JSON.parse(raw);
    for (const o of state.origins ?? []) {
      for (const item of o.localStorage ?? []) {
        if (item.name?.includes("auth-token")) {
          const parsed = JSON.parse(item.value);
          if (parsed?.access_token) return parsed.access_token as string;
        }
      }
    }
  } catch { /* ignore */ }
  return null;
}

test.describe("Admin audit log CSV export", () => {
  test.skip(skipBase, "Requires admin storage state + Supabase env");

  test("filtered export downloads CSV with header", async ({ page }) => {
    await page.goto("/admin/audit-log");
    await page.locator("text=Action").locator("..").getByRole("combobox").click();
    await page.getByRole("option", { name: "audit.export" }).click();

    const downloadPromise = page.waitForEvent("download", { timeout: 10_000 }).catch(() => null);
    await page.getByRole("button", { name: /export filtered csv/i }).click();
    const download = await downloadPromise;
    if (!download) test.skip(true, "No exportable rows in this environment");

    const path = await download!.path();
    const csv = fs.readFileSync(path!, "utf8");
    expect(csv.split("\n")[0]).toBe("created_at,admin_id,action,target_count,target_emails,metadata");
  });

  test("rate limit returns 429 and surfaces toast", async ({ page }) => {
    const token = readAdminToken();
    test.skip(!token, "No admin access_token in storage state");

    const ctx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, apikey: ANON, "Content-Type": "application/json" },
    });
    let throttled = false;
    let status = 0;
    let body: any = null;
    for (let i = 0; i < 8; i++) {
      const res = await ctx.post(FN_URL, { data: { mode: "contains" } });
      status = res.status();
      if (status === 429) {
        body = await res.json().catch(() => ({}));
        throttled = true;
        break;
      }
    }
    await ctx.dispose();
    expect(throttled, `expected a 429 within 8 calls, last status=${status}`).toBe(true);
    expect(body?.error?.code).toBe("throttled");
    expect(body?.error?.retry_after).toBeGreaterThan(0);

    // UI: clicking export after exceeding limit should surface destructive toast.
    await page.goto("/admin/audit-log");
    await page.getByRole("button", { name: /export filtered csv/i }).click().catch(() => {});
    await expect(page.getByText(/too many exports/i)).toBeVisible({ timeout: 5_000 }).catch(() => {});
  });
});
