import { expect, test } from "@playwright/test";

/**
 * The critical journey Checkpoint A asks for (section 13.3, section 16
 * Phase 1 exit criteria): start → Listen with an advancing highlight →
 * switch to I'll Read with word help → through every page → The End.
 * Firefly Words, rewards, the shelf and the parent view don't exist yet
 * (Phases 3–4), so this covers exactly what Phase 1 ships.
 */
test("Listen through to I'll Read, page by page, to The End", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Storylight" })).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();

  // Bootstrapping (session + profile + story fetch) needs a moment.
  await expect(page.locator(".reader-page-count")).toHaveText("Page 1 of 6", { timeout: 10_000 });

  // Listen is the default mode: the highlight should move off the first word.
  const listenTab = page.getByRole("tab", { name: "Listen" });
  await expect(listenTab).toHaveAttribute("aria-selected", "true");

  const firstWord = page.locator(".word").first();
  await expect(firstWord).toHaveClass(/word--active/);
  await expect(async () => {
    const activeCount = await page.locator(".word--active").count();
    const activeText = await page.locator(".word--active").first().textContent();
    expect(activeCount).toBeGreaterThan(0);
    expect(activeText).not.toBe(await firstWord.textContent());
  }).toPass({ timeout: 6000 });

  // Switch to I'll Read: narration stops, the child reads independently.
  await page.getByRole("tab", { name: "I'll Read" }).click();
  await expect(page.getByRole("tab", { name: "I'll Read" })).toHaveAttribute("aria-selected", "true");

  // Tap a word for help — this is the fallback affordance section 5.6
  // documents for pages with no cached per-word audio clip yet.
  const completionRequest = page.waitForRequest(
    (req) => req.url().includes("/page-completions") && req.method() === "POST",
  );
  await page.locator(".word", { hasText: "Nora" }).first().click();

  // Walk every remaining page: "Next line" when I'll Read has more lines,
  // otherwise "Next page" (or "The End" on the last one).
  for (let guard = 0; guard < 20; guard++) {
    const theEnd = page.getByRole("button", { name: "The End" });
    if (await theEnd.isVisible()) {
      await theEnd.click();
      break;
    }
    const nextLine = page.getByRole("button", { name: "Next line" });
    if (await nextLine.isVisible()) {
      await nextLine.click();
    } else {
      await page.getByRole("button", { name: "Next page" }).click();
    }
    await page.waitForTimeout(150);
  }

  await expect(page.getByRole("heading", { name: "The End" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Read again" })).toBeVisible();

  // The word-help tap on page 1 made it into a real completion request.
  const request = await completionRequest;
  const body = request.postDataJSON();
  expect(body.helpTaps).toBeGreaterThanOrEqual(1);
});
