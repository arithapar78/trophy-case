import { test, expect } from "@playwright/test";

// Covers REQUIREMENTS.md Feature 3 through the real UI.

/** Adds an achievement and returns its unique title. */
async function addAchievement(
  page: import("@playwright/test").Page,
  overrides: { title?: string; note?: string; category?: string } = {},
) {
  const title = overrides.title ?? `E2E subject ${Date.now()}-${Math.random()}`;

  await page.getByRole("button", { name: "Add achievement" }).click();
  const form = page.getByRole("form", { name: "Add an achievement" });
  await form.getByLabel("Title").fill(title);
  await form.getByLabel("Category").selectOption(overrides.category ?? "Other");
  if (overrides.note) await form.getByLabel(/^Note/).fill(overrides.note);
  await form.getByRole("button", { name: "Save achievement" }).click();
  await expect(form).toBeHidden();

  return title;
}

function cardFor(page: import("@playwright/test").Page, title: string) {
  return page.getByTestId("achievement-item").filter({ hasText: title });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Loading...")).toBeHidden();
});

test("edit opens a pre-filled form (3.1, 3.2)", async ({ page }) => {
  const title = await addAchievement(page, {
    note: "The original note",
    category: "Cooking",
  });

  await cardFor(page, title).getByRole("button", { name: /^Edit/ }).click();

  const form = page.getByRole("form", { name: "Edit achievement" });
  await expect(form).toBeVisible();
  await expect(form.getByLabel("Title")).toHaveValue(title);
  await expect(form.getByLabel(/^Note/)).toHaveValue("The original note");
  await expect(form.getByLabel("Category")).toHaveValue("Cooking");
});

test("saving an edit updates the timeline (3.3)", async ({ page }) => {
  const title = await addAchievement(page, { note: "Before" });
  const newTitle = `${title} EDITED`;

  await cardFor(page, title).getByRole("button", { name: /^Edit/ }).click();

  const form = page.getByRole("form", { name: "Edit achievement" });
  await form.getByLabel("Title").fill(newTitle);
  await form.getByLabel(/^Note/).fill("After");
  await form.getByLabel("Category").selectOption("Debate");
  await form.getByRole("button", { name: "Save changes" }).click();

  await expect(form).toBeHidden();

  const card = cardFor(page, newTitle);
  await expect(card).toBeVisible();
  await expect(card).toContainText("After");
  await expect(card).toContainText("Debate");

  // It really saved, not just on screen.
  await page.reload();
  await expect(cardFor(page, newTitle)).toBeVisible();
});

test("an invalid edit is rejected and the original survives (3.4)", async ({
  page,
}) => {
  const title = await addAchievement(page);

  await cardFor(page, title).getByRole("button", { name: /^Edit/ }).click();

  const form = page.getByRole("form", { name: "Edit achievement" });
  await form.getByLabel("Title").fill("");
  await form.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Please add a title.")).toBeVisible();

  // The form stays open and the original is untouched after a reload.
  await expect(form).toBeVisible();
  await page.reload();
  await expect(cardFor(page, title)).toBeVisible();
});

test("cancelling an edit changes nothing (3.5)", async ({ page }) => {
  const title = await addAchievement(page, { note: "Keep me" });

  await cardFor(page, title).getByRole("button", { name: /^Edit/ }).click();

  const form = page.getByRole("form", { name: "Edit achievement" });
  await form.getByLabel("Title").fill("This should never be saved");
  await form.getByRole("button", { name: "Cancel" }).click();

  await expect(form).toBeHidden();
  await expect(cardFor(page, title)).toBeVisible();
  await expect(cardFor(page, title)).toContainText("Keep me");
  await expect(
    page.getByText("This should never be saved"),
  ).toBeHidden();
});

test("delete asks first, and cancelling keeps it (3.8, 3.9, 3.11)", async ({
  page,
}) => {
  const title = await addAchievement(page);
  const card = cardFor(page, title);

  await card.getByRole("button", { name: /^Delete/ }).click();

  // Nothing is gone yet — it asks first.
  await expect(card.getByText("Delete this?")).toBeVisible();
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Cancel" }).click();
  await expect(card).toBeVisible();
  await expect(card.getByText("Delete this?")).toBeHidden();
});

test("confirming delete removes it for good (3.10, 3.12)", async ({ page }) => {
  const title = await addAchievement(page);
  const card = cardFor(page, title);

  await card.getByRole("button", { name: /^Delete/ }).click();
  await card.getByRole("button", { name: "Yes, delete" }).click();

  await expect(cardFor(page, title)).toHaveCount(0);

  // Still gone after a refresh.
  await page.reload();
  await expect(page.getByText("Loading...")).toBeHidden();
  await expect(cardFor(page, title)).toHaveCount(0);
});

test.afterAll(async ({ request }) => {
  // Remove anything these tests created, so the real timeline stays clean.
  const response = await request.get("/api/achievements");
  const { achievements } = await response.json();
  for (const achievement of achievements) {
    if (/^(E2E subject|Playwright test achievement)/.test(achievement.title)) {
      await request.delete(`/api/achievements/${achievement.id}`);
    }
  }
});
