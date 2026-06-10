import { test, expect } from "@playwright/test";

const skip = !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD;

test.describe("Admin audit log: payment_email.resend entries", () => {
  test.skip(skip, "Requires E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD");

  test("a resend creates an audit entry visible in /admin/audit-log", async ({ page }) => {
    // 1) Trigger a resend from the dashboard.
    await page.goto("/admin");
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await firstRow.locator('button[aria-label*="actions"]').click();
    await page.getByRole("menuitem", { name: /completed/i }).click();

    // 2) Go to audit log and filter to payment_email.resend.
    await page.goto("/admin/audit-log");
    await page.locator("text=Action").locator("..").getByRole("combobox").click();
    await page.getByRole("option", { name: "payment_email.resend" }).click();

    const row = page.locator('[data-testid="audit-log-row"]').first();
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText(/payment_email\.resend/);
  });
});
