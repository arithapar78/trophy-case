import { test, expect } from "@playwright/test";

// Covers REQUIREMENTS.md Feature 4 through the real UI.
// These run in MOCK mode (no API key), so no network call is made.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Loading...")).toBeHidden();
});

test("the button is visible and labelled clearly (4.1)", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: "Give me 3 college essay ideas" }),
  ).toBeVisible();
});

test("returns 3 ideas, each with a hook and its achievements (4.3 to 4.6)", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Give me 3 college essay ideas" }).click();

  const ideas = page.getByTestId("essay-idea");
  await expect(ideas).toHaveCount(3);

  // Collect the achievement titles actually on the timeline.
  const timelineTitles = await page
    .getByTestId("achievement-item")
    .evaluateAll((rows) =>
      rows.map((row) => row.querySelector("h3")?.textContent?.trim() ?? ""),
    );

  for (let i = 0; i < 3; i++) {
    const idea = ideas.nth(i);
    await expect(idea.locator("h3")).not.toBeEmpty();

    const text = await idea.innerText();
    expect(text).toContain("Based on:");

    // 4.7: every referenced achievement must be a real one.
    const basedOn = text.split("Based on:")[1] ?? "";
    for (const referenced of basedOn.split("·").map((s) => s.trim())) {
      if (!referenced) continue;
      expect(
        timelineTitles.some((title) => title === referenced),
        `"${referenced}" is not on the timeline`,
      ).toBe(true);
    }
  }
});

test("labels mock results, and doesn't label real ones (4.9, 4.10)", async ({
  page,
}) => {
  // Whether this machine has an API key decides which path runs, so assert
  // the rule rather than one outcome: a mock result must say so, and a real
  // result must not claim to be a sample.
  const isMock = await page.evaluate(async () => {
    const response = await fetch("/api/essay-ideas", { method: "POST" });
    return (await response.json()).isMock as boolean;
  });

  await page.getByRole("button", { name: "Give me 3 college essay ideas" }).click();
  await expect(page.getByTestId("essay-idea").first()).toBeVisible();

  const notice = page.getByTestId("mock-notice");

  if (isMock) {
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("Sample ideas");
    await expect(notice).toContainText("ANTHROPIC_API_KEY");
  } else {
    await expect(notice).toBeHidden();
  }
});

test("shows a loading state while it works (4.2)", async ({ page }) => {
  // Hold the response open so the loading state is observable.
  await page.route("/api/essay-ideas", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });

  await page.getByRole("button", { name: "Give me 3 college essay ideas" }).click();

  await expect(page.getByRole("button", { name: "Thinking..." })).toBeVisible();
  await expect(page.getByText("Reading your achievements...")).toBeVisible();

  await expect(page.getByTestId("essay-idea").first()).toBeVisible();
});

test("explains a failure in plain English and keeps working (4.12)", async ({
  page,
}) => {
  await page.route("/api/essay-ideas", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Couldn't reach Claude. Check your internet connection and try again.",
      }),
    }),
  );

  await page.getByRole("button", { name: "Give me 3 college essay ideas" }).click();

  await expect(
    page.locator("section").getByRole("alert"),
  ).toContainText("Couldn't reach Claude");

  // The rest of the app still works.
  await page.unroute("/api/essay-ideas");
  await expect(page.getByTestId("achievement-item").first()).toBeVisible();
});

test("tells you to add achievements first when there are none (4.11)", async ({
  page,
}) => {
  await page.route("/api/essay-ideas", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Add a few achievements first, then I can suggest essay ideas.",
      }),
    }),
  );

  await page.getByRole("button", { name: "Give me 3 college essay ideas" }).click();

  await expect(page.locator("section").getByRole("alert")).toContainText(
    "Add a few achievements first",
  );
  await expect(page.getByTestId("essay-idea")).toHaveCount(0);
});
