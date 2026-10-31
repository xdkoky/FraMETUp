import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "lang", value: "en", url: baseURL ?? "http://localhost:3000" }]);
});

test("a cinematography lesson can be completed from the learning path", async ({ page }) => {
  await signIn(page, "bence@frametup.local", "frametup-demo");
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Learn to direct" })).toBeVisible();
  await page.getByRole("tab", { name: "Cinematography" }).click();
  await expect(page.getByRole("heading", { name: "Learn the DoP's craft" })).toBeVisible();
  await page.getByRole("link", { name: /^Frame rate/ }).first().click();
  await expect(page).toHaveURL(/\/lesson\/camera\.framerate/);

  // Intro → four key ideas → drill → check
  await page.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("You shoot at 96 fps for a 24 fps project. How fast does it play?")).toBeVisible();

  // A wrong answer can be retried
  await page.getByRole("radio", { name: /At half speed/ }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Not quite")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();

  await page.getByRole("radio", { name: /At one quarter speed/ }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Nice work!")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Lesson complete!" })).toBeVisible();

  // Back on the path the lesson is marked done
  await page.getByRole("link", { name: "Back to the path" }).click();
  await expect(page.getByRole("link", { name: "Frame rate — completed" })).toBeVisible();

  // The lesson guide page: photos, drill upload and outside guides
  await page.goto("/learn/camera.shutter");
  await expect(page.getByRole("heading", { name: "See it for real" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Go deeper" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Shutter Angle In Cinematography Explained/ }).first()).toHaveAttribute("href", "https://www.youtube.com/watch?v=ehpdzt0JHUc");
  await expect(page.locator('img[src*="/learn/refs/camera-shutter-1.jpg"]').first()).toBeVisible();

  // Upload a drill result (private by default)
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const drill = page.locator("form").filter({ hasText: "Add your drill result" });
  await drill.locator('input[name="file"]').setInputFiles({ name: "drill.png", mimeType: "image/png", buffer: png });
  const caption = `Same action at 180° and 45° shutter ${Date.now()}`;
  await drill.getByLabel(/Caption/).fill(caption);
  await drill.getByLabel(/I took this picture/).check();
  await drill.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("Photo added.")).toBeVisible();
  await expect(page.getByRole("img", { name: caption })).toBeVisible();
  await expect(page.getByText("Only you can see this").first()).toBeVisible();
});
