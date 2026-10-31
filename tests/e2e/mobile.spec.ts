import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// The UI defaults to Hungarian; these specs assert on the English copy.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "lang", value: "en", url: baseURL ?? "http://localhost:3000" }]);
});

test("the app is usable on a phone", async ({ page }) => {
  await signIn(page, "demo@frametup.local", "frametup-demo");
  // Bottom tab bar, and the "More" sheet for everything else
  await page.getByRole("button", { name: "More" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation" }).getByRole("link", { name: "Timeline" })).toBeVisible();
  await page.getByRole("button", { name: "Close navigation" }).click();
  await page.getByRole("navigation", { name: "Main sections" }).getByRole("link", { name: "Tree" }).click();
  await expect(page).toHaveURL(/\/skills/);
  await page.getByLabel("Search skills").fill("Pacing");
  await page.getByRole("listbox", { name: "Search results" }).getByRole("button", { name: /Pacing/ }).click();
  await expect(page.getByRole("complementary", { name: "Pacing details" })).toBeVisible();
  // No horizontal overflow on content pages, in either language
  for (const lang of ["en", "hu"]) {
    await page.context().addCookies([{ name: "lang", value: lang, url: "http://localhost:3000" }]);
    for (const path of ["/dashboard", "/learn", "/production", "/viewfinder", "/lesson/lenses.focal", "/projects", "/feedback", "/dna", "/challenges", "/timeline", "/profile", "/settings", "/assess"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${lang} ${path}`).toBeLessThanOrEqual(1);
    }
  }
});
