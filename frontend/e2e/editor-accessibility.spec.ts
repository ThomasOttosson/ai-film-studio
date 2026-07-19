import { expect, test } from "@playwright/test";

test.describe("editor accessibility smoke tests", () => {
  test("supports keyboard navigation without trapping focus", async ({
    page,
  }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");

    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
  });

  test("exposes a valid document language and main landmark", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("interactive controls have accessible names", async ({ page }) => {
    await page.goto("/");

    const controls = page.locator(
      'button:visible, a[href]:visible, input:visible, select:visible, textarea:visible',
    );

    const count = await controls.count();

    for (let index = 0; index < count; index += 1) {
      const control = controls.nth(index);

      await expect(
        control,
        `Interactive control ${index + 1} must have an accessible name`,
      ).toHaveAccessibleName(/\S/);
    }
  });
});