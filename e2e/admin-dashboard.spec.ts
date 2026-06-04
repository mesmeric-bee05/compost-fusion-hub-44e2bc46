import { test, expect } from "@playwright/test";

test.describe("Admin dashboard authorization", () => {
  test("admin can reach /admin and sees dashboard heading + navbar link", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();
    // Navbar admin link visible
    await expect(page.getByRole("link", { name: /admin/i }).first()).toBeVisible();
  });

  test("logged-out user is redirected away from /admin", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth/);
    await ctx.close();
  });
});
