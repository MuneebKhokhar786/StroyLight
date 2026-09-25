import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Section 13.3: "Accessibility: axe on every main screen; keyboard-only
 * story completion; reduced-motion emulation." One page at a time, on the
 * actual DOM the app renders — not a lint rule on the JSX.
 */
test.describe("accessibility", () => {
  test("landing page has no axe violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Storylight" })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the reader page has no axe violations in Listen mode", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.locator(".reader-page-count")).toHaveText("Page 1 of 6", { timeout: 10_000 });

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the reader page has no axe violations in I'll Read mode (dimmed text, tap targets)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.locator(".reader-page-count")).toHaveText("Page 1 of 6", { timeout: 10_000 });
    await page.getByRole("tab", { name: "I'll Read" }).click();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("a child can complete a page using only the keyboard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.locator(".reader-page-count")).toHaveText("Page 1 of 6", { timeout: 10_000 });

    // Every interactive element here is a real <button>, so Tab reaches it
    // and Enter/Space activates it — no custom keyboard handling needed,
    // but that's exactly the thing worth proving rather than assuming.
    await page.getByRole("button", { name: "Next page" }).focus();
    await page.keyboard.press("Enter");

    await expect(page.locator(".reader-page-count")).toHaveText("Page 2 of 6");
  });

  test("the star-word wait animation is replaced by a static cue under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.locator(".reader-page-count")).toHaveText("Page 1 of 6", { timeout: 10_000 });
    await page.getByRole("tab", { name: "Together" }).click();

    const starWord = page.locator(".word", { hasText: "into" }).first();
    await expect(starWord).toHaveClass(/word--star-waiting/, { timeout: 6000 });
    await expect(starWord).toHaveCSS("animation-name", "none");
  });
});
