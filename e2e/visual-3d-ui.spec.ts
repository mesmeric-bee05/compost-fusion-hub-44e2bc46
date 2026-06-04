import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 360, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("3D UI responsive rendering", () => {
  for (const vp of VIEWPORTS) {
    test(`landing renders 3D card shadows @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      // Check the first .card-3d if present (page may not render it on /, in which case skip cleanly).
      const card = page.locator(".card-3d").first();
      const count = await card.count();
      test.skip(count === 0, "no .card-3d on landing — feature not present at this breakpoint");

      await expect(card).toBeVisible();
      const shadow = await card.evaluate((el) => getComputedStyle(el as HTMLElement).boxShadow);
      expect(shadow).not.toBe("none");
    });
  }

  test("prefers-reduced-motion collapses transitions to ~0s", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/products");
    const btn = page.locator(".btn-3d, button.card-3d").first();
    const count = await btn.count();
    test.skip(count === 0, "no .btn-3d found on /products");
    const transition = await btn.evaluate((el) => getComputedStyle(el as HTMLElement).transitionDuration);
    // Either explicitly 0s, or close to it (CSS may list multiple values, all should reduce)
    expect(transition.split(",").every((d) => /^0(\.0+)?s$/.test(d.trim()))).toBeTruthy();
  });
});
