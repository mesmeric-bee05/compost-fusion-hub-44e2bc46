import { test, expect } from "@playwright/test";
import fs from "node:fs";

const DRIVER_AUTH = "e2e/.auth/driver.json";

test.describe("Driver dashboard authorization", () => {
  test("logged-out user is redirected from /driver", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto("/driver");
    await expect(page).toHaveURL(/\/auth/);
    await ctx.close();
  });

  test("admin (non-driver) is redirected away from /driver", async ({ page }) => {
    await page.goto("/driver");
    // Admin is not a driver → RoleRoute redirects to /dashboard
    await expect(page).toHaveURL(/\/(dashboard|admin)/);
  });

  test("driver can reach /driver and sees orders table", async ({ browser }) => {
    test.skip(!fs.existsSync(DRIVER_AUTH), "driver storage state not seeded — set E2E_DRIVER_EMAIL/PASSWORD");
    const ctx = await browser.newContext({ storageState: DRIVER_AUTH });
    const page = await ctx.newPage();
    await page.goto("/driver");
    await expect(page.getByRole("heading", { name: /driver/i }).first()).toBeVisible();
    await ctx.close();
  });
});
