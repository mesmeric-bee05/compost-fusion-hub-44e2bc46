import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const skip = !URL || !SERVICE;

const admin = !skip ? createClient(URL, SERVICE) : null;

test.describe("Landing newsletter signup", () => {
  test.skip(skip, "Requires VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");

  const seeded: string[] = [];
  test.afterEach(async () => {
    if (admin && seeded.length) {
      await admin.from("newsletter_subscribers").delete().in("email", seeded);
      seeded.length = 0;
    }
  });

  test("renders skeleton, validates input, and subscribes valid email", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Skeleton briefly visible during initial mount delay.
    const skeleton = page.locator('[data-testid="newsletter-signup-skeleton"]');
    // Either it appears and disappears, or it has already disappeared — both valid.
    await skeleton.first().waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
    const form = page.locator('[data-testid="newsletter-signup-form"]');
    await expect(form).toBeVisible();

    // Invalid email path
    await form.locator('input[type="email"]').fill("not-an-email");
    await form.getByRole("button", { name: /subscribe/i }).click();
    await expect(page.getByRole("alert")).toContainText(/valid email/i);

    if (admin) {
      const { count } = await admin
        .from("newsletter_subscribers")
        .select("email", { count: "exact", head: true })
        .eq("email", "not-an-email");
      expect(count ?? 0).toBe(0);
    }

    // Valid email path
    const email = `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;
    seeded.push(email);
    await form.locator('input[type="email"]').fill(email);
    await form.getByRole("button", { name: /subscribe/i }).click();
    await expect(page.getByText(/Subscribed/i)).toBeVisible({ timeout: 5_000 });

    if (admin) {
      const { data } = await admin
        .from("newsletter_subscribers")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      expect(data?.email).toBe(email);
    }
  });
});
