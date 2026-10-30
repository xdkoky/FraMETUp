import { expect, type Page } from "@playwright/test";

/** Signs in and, if the starting-point quiz is offered, postpones it. */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|quiz)/);
  if (page.url().includes("/quiz")) {
    await page.getByRole("button", { name: /Skip for now/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  }
}
