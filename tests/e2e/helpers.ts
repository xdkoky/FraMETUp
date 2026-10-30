import { expect, type Page } from "@playwright/test";

/** Signs in and, if the starting-point quiz is offered, postpones it. */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|quiz)/);
  const skip = page.getByRole("button", { name: /Skip for now/ });
  if (/\/quiz/.test(page.url()) || (await skip.waitFor({ timeout: 5000 }).then(() => true, () => false))) {
    await skip.click();
  }
  await expect(page).toHaveURL(/\/dashboard/);
}
