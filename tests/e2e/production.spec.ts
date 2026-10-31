import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "lang", value: "en", url: baseURL ?? "http://localhost:3000" }]);
});

async function signOut(page: Page) {
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "lang", value: "en", url: "http://localhost:3000" }]);
}

test("a production goes from planning to wrap with crew, call sheet, live set and reflection", async ({ page }) => {
  test.setTimeout(300_000);
  const title = `E2E shoot ${Date.now()}`;

  // Director creates the production
  await signIn(page, "demo@frametup.local", "frametup-demo");
  await page.goto("/production/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Shooting date and time").fill("2026-12-03T09:00");
  await page.getByRole("button", { name: "Create production" }).click();
  await expect(page).toHaveURL(/\/production\/c[^/]+$/);
  const base = page.url();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Preparation").first()).toBeVisible();

  // Crew: invite a DoP with an account, add a guest actor
  await page.goto(`${base}/crew`);
  const invite = page.locator("form").filter({ hasText: "Send invitation" });
  await invite.getByLabel("Email").fill("bence@frametup.local");
  await invite.getByText("Director of Photography", { exact: true }).click();
  await invite.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText("Invitation sent.")).toBeVisible();
  const guest = page.locator("form").filter({ has: page.getByLabel("Name") });
  await guest.getByLabel("Name").fill("Eszter (actor)");
  await guest.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Eszter (actor)")).toBeVisible();

  // Scene, brief and a shot
  await page.goto(`${base}/scenes`);
  await page.getByLabel("Title").fill("INT. Stairwell — night");
  await page.getByRole("button", { name: "Add scene" }).click();
  await expect(page).toHaveURL(/\/scenes\/c/);
  await page.getByLabel("Dramatic objective").fill("She decides to leave");
  await page.getByLabel("Visual intention").fill("Tight, then a wide reveal");
  await page.getByRole("button", { name: "Save brief" }).click();
  const add = page.locator("form").filter({ hasText: "Add shot" });
  await add.getByLabel("Description").fill("Her face as the door slams");
  await add.getByLabel("Focal length (mm)").fill("50");
  await add.getByLabel("Setup time (min)").fill("15");
  await add.getByRole("button", { name: "Add shot" }).click();
  await expect(page.getByText("Her face as the door slams")).toBeVisible();

  // Call sheet: create and publish
  await page.goto(`${base}/callsheet`);
  await page.getByLabel("General crew call").fill("08:30");
  await page.getByLabel("Emergency contact").fill("Studio office +36 1 000 0000");
  await page.getByRole("button", { name: "Publish to crew" }).click();
  await expect(page.getByText(/Version 1 ·/)).toBeVisible();

  // The DoP joins and confirms the call sheet
  await signOut(page);
  await signIn(page, "bence@frametup.local", "frametup-demo");
  await page.goto("/production");
  await page.locator("li").filter({ hasText: title }).getByRole("button", { name: "Join" }).click();
  await expect(page).toHaveURL(base);
  await page.goto(`${base}/callsheet`);
  await expect(page.getByText("08:30").first()).toBeVisible();
  await page.getByRole("button", { name: "I've read it — confirm" }).click();
  await expect(page.getByText("You confirmed this version.")).toBeVisible();

  // Live set: the DoP can move the shot through its statuses and mark camera ready
  await page.goto(`${base}/live`);
  await page.getByRole("button", { name: "Start preparation" }).click();
  await page.getByRole("button", { name: /Camera/ }).first().click();
  await page.getByRole("button", { name: "Mark ready" }).click();
  await page.getByRole("button", { name: "Start shooting" }).click();
  await page.getByRole("button", { name: "Mark completed" }).click();
  await expect(page.getByText("All shots are done or skipped.")).toBeVisible();

  // Director wraps
  await signOut(page);
  await signIn(page, "demo@frametup.local", "frametup-demo");
  await page.goto(`${base}/settings`);
  await page.getByRole("button", { name: "Wrapped" }).click();
  await page.goto(`${base}/wrap`);
  await expect(page.getByText("Production summary")).toBeVisible();
  await expect(page.getByText("1/1").first()).toBeVisible();

  // The DoP reflects and gets a portfolio project with practice-only skill links
  await signOut(page);
  await signIn(page, "bence@frametup.local", "frametup-demo");
  await page.goto(`${base}/wrap`);
  await page.getByLabel("How successfully did you translate the director's vision into images?").fill("The tight singles worked; the wide reveal needed more light on the stairs.");
  await page.getByRole("button", { name: "Save reflection" }).click();
  await expect(page).toHaveURL(/\/projects\/c[^?]+\?fromProduction=1/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

test("people outside a production can't open it or poll it", async ({ page }) => {
  await signIn(page, "demo@frametup.local", "frametup-demo");
  await page.goto("/production/new");
  await page.getByLabel("Title").fill(`Private shoot ${Date.now()}`);
  await page.getByRole("button", { name: "Create production" }).click();
  await expect(page).toHaveURL(/\/production\/c[^/]+$/);
  const base = page.url();
  await signOut(page);
  await signIn(page, "dora@frametup.local", "frametup-demo");
  await page.goto(base);
  await expect(page.getByRole("heading", { name: "We couldn't find that." })).toBeVisible();
  await expect(page.getByText("Private shoot")).toHaveCount(0);
  const file = await page.request.get(`${base.replace("/production/", "/api/productions/")}/pulse`);
  expect(file.status()).toBe(404);
});

test("the virtual viewfinder frames a cinema lens through the camera", async ({ page, context }) => {
  await context.grantPermissions(["camera"]);
  await signIn(page, "demo@frametup.local", "frametup-demo");
  await page.goto("/viewfinder");
  await page.getByRole("button", { name: "Start camera" }).click();
  await page.getByRole("radio", { name: "50", exact: true }).click();
  // ALEXA 35 open gate (27.99 × 19.22 mm) at 50 mm → 31° × 22°
  await expect(page.getByText(/50 mm · 31°×22°/)).toBeVisible();
  await expect(page.getByText("≈ Approximate")).toBeVisible();
  await page.getByRole("radio", { name: "18", exact: true }).click();
  await expect(page.getByText(/wider than this phone camera can see/)).toBeVisible();
  await page.getByRole("button", { name: "Calibrate", exact: true }).click();
  await page.getByLabel("Camera name").fill(`E2E camera ${Date.now()}`);
  await page.getByLabel("Distance (cm)").fill("30");
  await page.getByRole("button", { name: "Save calibration" }).click();
  await expect(page.getByText(/Calibrated: 52\.7° across the long side/)).toBeVisible();
});
