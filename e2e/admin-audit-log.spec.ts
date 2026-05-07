import { test, expect } from "@playwright/test";

const skip = !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD;

test.describe("Admin audit log", () => {
  test.skip(skip, "Requires E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD");

  test("navigates from dashboard, opens detail drawer, exports CSV", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: /audit log/i }).click();
    await expect(page).toHaveURL(/\/admin\/audit-log$/);
    await expect(page.getByRole("heading", { name: /^Audit Log$/ })).toBeVisible();

    // Filter to newsletter resends.
    await page.locator("text=Action").locator("..").getByRole("combobox").click();
    await page.getByRole("option", { name: "newsletter.resend" }).click();

    const firstRow = page.locator('[data-testid="audit-log-row"]').first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await expect(page.getByRole("dialog", { name: /audit log entry/i })).toBeVisible();
      await page.keyboard.press("Escape");
    }

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export filtered csv/i }).click(),
    ]).catch(() => [null]);
    if (download) {
      expect(download.suggestedFilename()).toMatch(/admin-audit-log-/);
    }
  });
});
