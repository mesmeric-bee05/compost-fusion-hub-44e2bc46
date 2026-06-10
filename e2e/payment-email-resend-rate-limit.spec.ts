import { test, expect } from "@playwright/test";

const skip = !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD;

test.describe("Payment email resend rate limit", () => {
  test.skip(skip, "Requires E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD");

  test("surfaces a rate-limit error after exceeding 3 resends in 60 minutes", async ({ page }) => {
    await page.goto("/admin");
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    const actionsButton = firstRow.locator('button[aria-label*="actions"]');
    let sawRateLimit = false;

    for (let i = 0; i < 5; i++) {
      await actionsButton.click();
      await page.getByRole("menuitem", { name: /completed/i }).click();
      const toast = page.locator("[data-sonner-toast], [role='status']").first();
      await toast.waitFor({ timeout: 5_000 }).catch(() => null);
      const txt = (await toast.textContent().catch(() => "")) ?? "";
      if (/rate limit|try again in/i.test(txt)) {
        sawRateLimit = true;
        break;
      }
      // Small pause to let the cooldown timer be the cause once we exceed 3 in the window.
      await page.waitForTimeout(800);
    }
    expect(sawRateLimit).toBe(true);
  });
});
