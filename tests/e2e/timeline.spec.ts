import { test, expect } from "@playwright/test";

// Covers REQUIREMENTS.md Feature 2 through the real UI.

const SEARCH_BOX = "Search your achievements";

/** Waits for the first load to finish so counts aren't read from an empty page. */
async function waitForTimeline(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByText("Loading...")).toBeHidden();
}

test("shows achievements newest first (2.1, 2.2)", async ({ page }) => {
  await waitForTimeline(page);

  const items = page.getByTestId("achievement-item");
  await expect(items.first()).toBeVisible();

  // Read each row's date and confirm the order never goes back up.
  const dates = await items.evaluateAll((rows) =>
    rows.map((row) => {
      const text = row.querySelectorAll("p")[0]?.textContent ?? "";
      return new Date(text).getTime();
    }),
  );

  expect(dates.length).toBeGreaterThan(1);
  for (let i = 1; i < dates.length; i++) {
    expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
  }
});

test("filters by category and back to All (2.7, 2.8, 2.9)", async ({ page }) => {
  await waitForTimeline(page);
  const items = page.getByTestId("achievement-item");
  const total = await items.count();

  await page.getByRole("button", { name: "Sports", exact: true }).click();
  await expect
    .poll(async () =>
      (await items.allInnerTexts()).every((t) => t.includes("Sports")),
    )
    .toBe(true);
  expect(await items.count()).toBeLessThan(total);

  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect.poll(() => items.count()).toBe(total);
});

test("searches title and note, ignoring case (2.10 to 2.12)", async ({ page }) => {
  await waitForTimeline(page);
  const items = page.getByTestId("achievement-item");

  // Matches a title.
  await page.getByPlaceholder(SEARCH_BOX).fill("SOCCER");
  await expect
    .poll(async () => {
      const texts = await items.allInnerTexts();
      return texts.length > 0 && texts.every((t) => /soccer/i.test(t));
    })
    .toBe(true);

  // Matches text that only appears in a note.
  await page.getByPlaceholder(SEARCH_BOX).fill("teammates");
  await expect
    .poll(async () => {
      const texts = await items.allInnerTexts();
      return texts.length === 1 && /teammates/i.test(texts[0]);
    })
    .toBe(true);
});

test("combines category filter with search (2.13)", async ({ page }) => {
  await waitForTimeline(page);
  const items = page.getByTestId("achievement-item");

  await page.getByRole("button", { name: "School", exact: true }).click();
  await page.getByPlaceholder(SEARCH_BOX).fill("SAT");

  await expect
    .poll(async () => {
      const texts = await items.allInnerTexts();
      return (
        texts.length === 1 &&
        texts[0].includes("School") &&
        /SAT/i.test(texts[0])
      );
    })
    .toBe(true);
});

test("explains when nothing matches (2.14)", async ({ page }) => {
  await waitForTimeline(page);

  await page.getByPlaceholder(SEARCH_BOX).fill("zzzz-no-such-thing");

  await expect(page.getByText("Nothing matches that")).toBeVisible();
  await expect(page.getByTestId("achievement-item")).toHaveCount(0);
});

test("layout works at phone width (N.4)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForTimeline(page);

  await expect(page.getByTestId("achievement-item").first()).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
});
