import { expect, test } from "@playwright/test";

// The UI defaults to Hungarian; these specs assert on the English copy.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "lang", value: "en", url: baseURL ?? "http://localhost:3000" }]);
});

test("the app is usable on a phone", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@frametup.local");
  await page.getByLabel("Password").fill("frametup-demo");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("dialog", { name: "Navigation" }).getByRole("link", { name: "Skill Tree" }).click();
  await expect(page).toHaveURL(/\/skills/);
  await page.getByLabel("Search skills").fill("Pacing");
  await page.getByRole("listbox", { name: "Search results" }).getByRole("button", { name: /Pacing/ }).click();
  await expect(page.getByRole("complementary", { name: "Pacing details" })).toBeVisible();
  // No horizontal overflow on content pages
  await page.goto("/projects");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
