import { test, expect } from "@playwright/test";

test("editor application loads successfully", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/.+/);

  await expect(page.locator("body")).toBeVisible();
});