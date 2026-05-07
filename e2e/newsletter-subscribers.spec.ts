import { test, expect } from "@playwright/test";
import { seedSubscribers, E2E_TAG } from "./helpers/seed";

const skip = !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD;

test.describe("Newsletter subscribers admin flows", () => {
  test.skip(skip, "Requires E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: /^Subscribers$/ }).click();
    await expect(page.getByRole("heading", { name: /Newsletter Subscribers/ })).toBeVisible();
  });

  test("select-all-matching, export, copy, bulk delete, resend spinner", async ({ page, context }) => {
    const seeded = await seedSubscribers(30);

    // Filter to just our seeded rows.
    await page.getByPlaceholder(/search email/i).fill(E2E_TAG);
    await expect(page.getByText(`Newsletter Subscribers (${seeded.length})`)).toBeVisible({ timeout: 15_000 });

    // 1. Select all on page → banner appears → select-all-matching.
    await page.getByRole("checkbox", { name: /select all on page/i }).click();
    const banner = page.getByRole("status");
    await expect(banner).toContainText(/select all .* matching/i);
    await banner.getByRole("button", { name: /select all .* matching/i }).click();
    await expect(banner).toContainText(/all 30 matching subscribers selected/i);

    // 2. Export CSV — assert the download.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export csv/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/newsletter-subscribers-/);

    // 3. Copy emails (clipboard read needs permission).
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: /copy all matching/i }).click();
    await expect(page.getByText(/copied 30 emails/i)).toBeVisible();

    // 4. Resend spinner — intercept to delay response 1.5s.
    await page.route("**/functions/v1/send-newsletter-welcome", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: "test" }),
      });
    });
    const firstResend = page.getByRole("button", { name: /resend welcome email/i }).first();
    await firstResend.click();
    await expect(firstResend).toHaveAttribute("aria-busy", "true");
    await expect(firstResend).toBeDisabled();
    await expect(firstResend).not.toBeDisabled({ timeout: 10_000 });
    await page.unroute("**/functions/v1/send-newsletter-welcome");

    // 5. Throttled UX — force 429.
    await page.route("**/functions/v1/send-newsletter-welcome", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "throttled", message: "Too many resends.", retry_after: 30 } }),
      });
    });
    await firstResend.click();
    await expect(page.getByText(/too many resends.*30s/i)).toBeVisible();
    await page.unroute("**/functions/v1/send-newsletter-welcome");

    // 6. Bulk delete with confirmation. Reselect all matching first.
    await page.getByPlaceholder(/search email/i).fill(E2E_TAG);
    await page.getByRole("checkbox", { name: /select all on page/i }).click();
    await page.getByRole("button", { name: /select all .* matching/i }).click();
    await page.getByRole("button", { name: /delete 30/i }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText(/remove all 30 matching subscribers/i);
    await dialog.getByRole("button", { name: /^cancel$/i }).click();

    await page.getByRole("button", { name: /delete 30/i }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: /^delete$/i }).click();
    await expect(page.getByText(/removed 30 subscribers/i)).toBeVisible();
  });
});
