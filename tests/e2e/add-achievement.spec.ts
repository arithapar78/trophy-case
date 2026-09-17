import { test, expect } from "@playwright/test";

// Covers REQUIREMENTS.md T.11 to T.14: drive the real app in a real browser,
// sized like a phone, the way someone actually uses it.

// An iPhone-ish viewport, because this app is built for a phone first.
test.use({ viewport: { width: 390, height: 844 } });

/** Opens the sheet without a photo and fills it in. */
async function addAchievement(
  page: import("@playwright/test").Page,
  title: string,
  category = "Debate",
  note = "Added by the end-to-end test.",
) {
  await page.getByRole("button", { name: "Add without a photo" }).click();

  const sheet = page.getByRole("form", { name: "New achievement" });
  await expect(sheet).toBeVisible();

  await sheet.getByLabel("What did you do?").fill(title);
  await sheet.getByRole("button", { name: category }).click();
  if (note) await sheet.getByLabel(/^Note/).fill(note);

  await sheet.getByRole("button", { name: "Add to timeline" }).click();
  await expect(sheet).toBeHidden();
}

test("adding an achievement shows it on the timeline", async ({ page }) => {
  await page.goto("/");

  // A unique title so this test doesn't collide with existing data.
  const title = `Playwright test achievement ${Date.now()}`;

  await addAchievement(page, title);

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

test("the camera button is on screen and ready", async ({ page }) => {
  await page.goto("/");

  const camera = page.getByRole("button", {
    name: "Take a photo of an achievement",
  });
  await expect(camera).toBeVisible();

  // The hidden input behind it is what opens the phone's camera.
  const input = page.locator('input[type="file"][capture="environment"]');
  await expect(input).toHaveAttribute("accept", "image/*");
});

test("the date defaults to today so a quick save needs no date input", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add without a photo" }).click();

  const today = new Date();
  const expected = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  await expect(page.getByLabel("When")).toHaveValue(expected);
});

test("saving without a title shows an error and saves nothing", async ({
  page,
}) => {
  await page.goto("/");

  // Wait for the list to finish loading before counting, otherwise we would
  // compare against an empty page rather than the real number.
  await expect(page.getByText("Loading…")).toBeHidden();
  const countBefore = await page.getByTestId("achievement-item").count();

  await page.getByRole("button", { name: "Add without a photo" }).click();
  await page.getByRole("button", { name: "Add to timeline" }).click();

  await expect(page.getByText("Please add a title.")).toBeVisible();
  expect(await page.getByTestId("achievement-item").count()).toBe(countBefore);
});

test("an achievement can be edited and then deleted", async ({ page }) => {
  await page.goto("/");

  const title = `Playwright test achievement edit ${Date.now()}`;
  await addAchievement(page, title, "Sports", "Before the edit.");

  const item = page.getByTestId("achievement-item").filter({ hasText: title });
  await expect(item).toBeVisible();

  // Edit it.
  await item.getByRole("button", { name: `Edit ${title}` }).click();
  const sheet = page.getByRole("form", { name: "Edit achievement" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel("What did you do?")).toHaveValue(title);

  await sheet.getByLabel(/^Note/).fill("After the edit.");
  await sheet.getByRole("button", { name: "Save changes" }).click();
  await expect(sheet).toBeHidden();
  await expect(item).toContainText("After the edit.");

  // Delete it, confirming first.
  await item.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(item.getByText("Delete this?")).toBeVisible();
  await item.getByRole("button", { name: "Yes, delete" }).click();

  await expect(
    page.getByTestId("achievement-item").filter({ hasText: title }),
  ).toHaveCount(0);

  // Still gone after a refresh.
  await page.reload();
  await expect(
    page.getByTestId("achievement-item").filter({ hasText: title }),
  ).toHaveCount(0);
});

test("search and the category filter narrow the timeline together", async ({
  page,
}) => {
  await page.goto("/");

  const stamp = Date.now();
  const sportsTitle = `Playwright test achievement regional swim ${stamp}`;
  const artsTitle = `Playwright test achievement regional mural ${stamp}`;

  await addAchievement(page, sportsTitle, "Sports", "");
  await addAchievement(page, artsTitle, "Arts", "");

  // Search alone finds both.
  await page.getByLabel("Search achievements").fill(`regional mural ${stamp}`);
  await expect(
    page.getByTestId("achievement-item").filter({ hasText: artsTitle }),
  ).toBeVisible();
  await expect(
    page.getByTestId("achievement-item").filter({ hasText: sportsTitle }),
  ).toHaveCount(0);

  // Filtering to Sports while that search is active shows nothing.
  await page.getByRole("group", { name: "Filter by category" })
    .getByRole("button", { name: "Sports" })
    .click();
  await expect(page.getByText("Nothing matches that")).toBeVisible();
});

test.afterAll(async ({ request }) => {
  // Remove anything these tests created, so the real timeline stays clean.
  const response = await request.get("/api/achievements");
  const { achievements } = await response.json();
  for (const achievement of achievements) {
    if (/^Playwright test achievement/.test(achievement.title)) {
      await request.delete(`/api/achievements/${achievement.id}`);
    }
  }
});
