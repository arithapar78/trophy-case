import { test, expect } from "@playwright/test";

// Covers REQUIREMENTS-v2.md Feature 1 through the real UI.

test.beforeEach(async ({ request }) => {
  // Start every test from Free with a real clock. The button for the active
  // plan is disabled by design, so tests can't assume which one is set.
  await request.put("/api/settings", { data: { plan: "Free" } });
  await request.put("/api/settings", { data: { resetClock: true } });
});

test.afterAll(async ({ request }) => {
  // Leave the app on Free with a real clock, whatever the tests did.
  await request.put("/api/settings", { data: { plan: "Free" } });
  await request.put("/api/settings", { data: { resetClock: true } });
});

test("settings is reachable from the timeline (1.1)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Settings" }).click();

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);
});

test("shows the active plan and lets me switch (1.2, 1.3)", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByTestId("current-plan")).toBeVisible();

  await page.getByRole("button", { name: "Pro", exact: true }).click();
  await expect(page.getByTestId("current-plan")).toHaveText("Pro");

  await page.getByRole("button", { name: "Free", exact: true }).click();
  await expect(page.getByTestId("current-plan")).toHaveText("Free");
});

test("the plan survives a refresh (1.4)", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Pro", exact: true }).click();
  await expect(page.getByTestId("current-plan")).toHaveText("Pro");

  await page.reload();
  await expect(page.getByTestId("current-plan")).toHaveText("Pro");
});

test("says plainly it is a test switch (1.6)", async ({ page }) => {
  await page.goto("/settings");

  await expect(
    page.getByText("This is a test switch, not a real subscription."),
  ).toBeVisible();
});

test("the prompt limit follows the plan (1.7, 1.8)", async ({ page }) => {
  await page.goto("/settings");

  await page.getByRole("button", { name: "Pro", exact: true }).click();
  await expect(page.getByTestId("prompt-limit")).toHaveText("100");

  await page.getByRole("button", { name: "Free", exact: true }).click();
  await expect(page.getByTestId("prompt-limit")).toHaveText("10");
});

test("the plan is stored on the server, not the browser (1.9)", async ({
  page,
  request,
}) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Pro", exact: true }).click();
  await expect(page.getByTestId("current-plan")).toHaveText("Pro");

  // A request with no browser involved must see the same plan.
  const response = await request.get("/api/settings");
  expect((await response.json()).plan).toBe("Pro");

  // Clearing browser storage must not reset it.
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByTestId("current-plan")).toHaveText("Pro");
});

test("switching plans never touches achievements (1.10)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Loading...")).toBeHidden();
  const before = await page.getByTestId("achievement-item").count();
  expect(before).toBeGreaterThan(0);

  await page.goto("/settings");
  await page.getByRole("button", { name: "Pro", exact: true }).click();
  await expect(page.getByTestId("current-plan")).toHaveText("Pro");
  await page.getByRole("button", { name: "Free", exact: true }).click();
  await expect(page.getByTestId("current-plan")).toHaveText("Free");

  await page.goto("/");
  await expect(page.getByText("Loading...")).toBeHidden();
  expect(await page.getByTestId("achievement-item").count()).toBe(before);
});

test("the test clock moves and resets (2.18, 9.11)", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByTestId("clock-offset")).toHaveText("real time");

  await page.getByRole("button", { name: "Skip 5 hours" }).click();
  await expect(page.getByTestId("clock-offset")).toContainText("5 hours");

  await page.getByRole("button", { name: "Skip 61 days" }).click();
  await expect(page.getByTestId("clock-offset")).toContainText("61 days");

  await page.getByRole("button", { name: "Back to real time" }).click();
  await expect(page.getByTestId("clock-offset")).toHaveText("real time");
});
