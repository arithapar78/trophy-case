import { test, expect } from "@playwright/test";

// Covers REQUIREMENTS.md T.14: add an achievement through the real UI and
// confirm it lands on the timeline.

test("adding an achievement shows it on the timeline", async ({ page }) => {
  await page.goto("/");

  // A unique title so this test doesn't collide with existing data.
  const title = `Playwright test achievement ${Date.now()}`;

  await page.getByRole("button", { name: "Add achievement" }).click();

  const form = page.getByRole("form", { name: "Add an achievement" });
  await expect(form).toBeVisible();

  await form.getByLabel("Title").fill(title);
  await form.getByLabel("Category").selectOption("Debate");
  await form.getByLabel(/^Note/).fill("Added by the end-to-end test.");

  await form.getByRole("button", { name: "Save achievement" }).click();

  // The form closes and the new achievement appears without a page reload.
  await expect(form).toBeHidden();

  const newItem = page.getByTestId("achievement-item").filter({ hasText: title });
  await expect(newItem).toBeVisible();
  await expect(newItem).toContainText("Debate");
  await expect(newItem).toContainText("Added by the end-to-end test.");

  // It's really saved, not just on screen.
  await page.reload();
  await expect(
    page.getByTestId("achievement-item").filter({ hasText: title }),
  ).toBeVisible();
});

test("the date defaults to today so a quick save needs no date input", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add achievement" }).click();

  const today = new Date();
  const expected = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  await expect(page.getByLabel("Date")).toHaveValue(expected);
});

test("saving without a title shows an error and saves nothing", async ({
  page,
}) => {
  await page.goto("/");

  // Wait for the list to finish loading before counting, otherwise we would
  // compare against an empty page rather than the real number.
  await expect(page.getByText("Loading...")).toBeHidden();
  const countBefore = await page.getByTestId("achievement-item").count();

  await page.getByRole("button", { name: "Add achievement" }).click();
  await page.getByRole("button", { name: "Save achievement" }).click();

  await expect(page.getByText("Please add a title.")).toBeVisible();
  expect(await page.getByTestId("achievement-item").count()).toBe(countBefore);
});
