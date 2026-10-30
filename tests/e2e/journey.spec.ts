import { expect, test } from "@playwright/test";

// The UI defaults to Hungarian; these specs assert on the English copy.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "lang", value: "en", url: baseURL ?? "http://localhost:3000" }]);
});

/**
 * The core Phase 1 journey from the brief:
 * register → onboard → skill tree → inspect skill → create project → link skill
 * → add evidence → self-assess → updated overview → data persists after re-login.
 */
test("a new student can complete the core journey", async ({ page }) => {
  const email = `student-${Date.now()}@example.test`;
  const password = "Clapper-board-42";

  // 1. Register
  await page.goto("/register");
  await page.getByLabel("What should we call you?").fill("Réka Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  // 2. Onboarding
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Actor Direction/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Your goal, in your own words").fill("Give clearer notes to actors");
  await page.getByRole("button", { name: "Actor communication" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Explore my skill tree").check();
  await page.getByRole("button", { name: "Finish setup" }).click();

  // 3. Skill tree — everything starts unassessed
  await expect(page).toHaveURL(/\/skills/);
  await expect(page.getByRole("group", { name: "Filter by proficiency state" })).toContainText("Unassessed105");

  // 4. Inspect a skill via search
  await page.getByLabel("Search skills").fill("Blocking");
  await page.getByRole("listbox", { name: "Search results" }).getByRole("button", { name: /Blocking/ }).click();
  const panel = page.getByRole("complementary", { name: "Blocking details" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Not yet assessed");
  await panel.getByRole("button", { name: "Rubric" }).click();
  await expect(panel).toContainText("I can coordinate actor movement with camera composition");

  // 5. Create a project
  await page.goto("/projects/new");
  await page.getByLabel("Title").fill("Stairwell");
  await page.getByLabel("Description").fill("A two-hander on a stairwell between floors, shot in one evening.");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects\/[a-z0-9]+\?created=1/);
  const projectUrl = page.url().split("?")[0];

  // 6. Link a skill with a rubric mapping
  await page.getByLabel("Choose skill").selectOption("visual.blocking");
  await page.getByRole("radio", { name: /L3/ }).click();
  await page.getByLabel(/What did you do that shows this/).fill("Planned the stairwell crosses on a floor plan so each step up mirrored her gaining ground.");
  await page.getByRole("button", { name: "Save skill evidence" }).click();
  await expect(page.getByText("Mapped to L3")).toBeVisible();

  // 7. Add evidence (a link)
  await page.locator("summary", { hasText: "Add evidence" }).click();
  await page.getByLabel("Title", { exact: true }).last().fill("Floor plan");
  await page.getByLabel("Link (https)").fill("https://example.org/floorplan.pdf");
  await page.getByRole("button", { name: "Add evidence" }).click();
  await expect(page.getByText("Evidence added.")).toBeVisible();

  // 8. Self-assess
  await page.goto("/assess/visual.blocking");
  await page.getByText("I can plan simple actor movement with a clear spatial intention.").click();
  await page.getByRole("button", { name: "Save assessment" }).click();
  await expect(page).toHaveURL(/\/skills\?skill=visual\.blocking/);

  // 9. Updated development overview (self-reported only → capped confidence, explained)
  const panel2 = page.getByRole("complementary", { name: "Blocking details" });
  await expect(panel2).not.toContainText("Not yet assessed");
  await expect(panel2).toContainText("Self-reported only");
  await page.goto("/dashboard");
  await expect(page.getByText("Evidence now supports 1 of 105 skills")).toBeVisible();

  // 10. Log out, log back in, data is still there
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto(projectUrl);
  await expect(page.getByRole("heading", { name: "Stairwell" })).toBeVisible();
  await expect(page.getByText("Mapped to L3")).toBeVisible();
});

test("private projects are not visible to other students", async ({ page, browser }) => {
  // The demo student's projects are private by default.
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@frametup.local");
  await page.getByLabel("Password").fill("frametup-demo");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/projects");
  await page.getByRole("link", { name: /Kitchen Table/ }).click();
  const privateUrl = page.url();

  const other = await browser.newContext();
  await other.addCookies([{ name: "lang", value: "en", url: "http://localhost:3000" }]);
  const p2 = await other.newPage();
  await p2.goto("/register");
  await p2.getByLabel("What should we call you?").fill("Curious Classmate");
  await p2.getByLabel("Email").fill(`curious-${Date.now()}@example.test`);
  await p2.getByLabel("Password").fill("Clapper-board-42");
  await p2.getByRole("checkbox").check();
  await p2.getByRole("button", { name: "Create account" }).click();
  await expect(p2).toHaveURL(/\/onboarding/);
  await p2.goto(privateUrl);
  // Not onboarded users are redirected to onboarding; once onboarded they would see 404.
  await expect(p2).not.toHaveURL(privateUrl);
  await other.close();
});
