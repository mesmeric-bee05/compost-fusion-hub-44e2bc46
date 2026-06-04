import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const AUTH_FILE = "e2e/.auth/driver.json";

setup("authenticate as driver", async ({ page }) => {
  const email = process.env.E2E_DRIVER_EMAIL;
  const password = process.env.E2E_DRIVER_PASSWORD;

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  if (!email || !password) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip(true, "E2E_DRIVER_EMAIL / E2E_DRIVER_PASSWORD not set");
    return;
  }

  await page.goto("/auth");
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).first().click();
  await page.waitForURL(/\/(dashboard|driver|$)/, { timeout: 20_000 });
  await page.context().storageState({ path: AUTH_FILE });
});
