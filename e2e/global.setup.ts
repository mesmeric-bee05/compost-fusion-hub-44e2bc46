import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const AUTH_FILE = "e2e/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  // If creds aren't provided, write an empty storage state so dependent tests
  // can run/skip cleanly without a hard auth failure here.
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  if (!email || !password) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip(true, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set");
    return;
  }

  await page.goto("/auth");
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).first().click();

  await page.waitForURL(/\/(dashboard|admin|onboarding|$)/, { timeout: 20_000 });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
