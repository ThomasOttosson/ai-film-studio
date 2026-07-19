import { expect, test } from "@playwright/test";

test.describe("editor accessibility smoke tests", () => {
  test("supports keyboard navigation without trapping focus", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible();

    const focusableControls = page.locator(
      'a[href]:visible, button:visible, input:visible, select:visible, textarea:visible, [tabindex]:not([tabindex="-1"]):visible',
    );
    await expect(focusableControls.first()).toBeVisible();

    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
    await page.keyboard.press("Tab");

    await expect
      .poll(() =>
        page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null;
          return Boolean(active && active !== document.body && active !== document.documentElement);
        }),
      )
      .toBe(true);

    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.setAttribute(
        "data-e2e-first-focus",
        "true",
      );
    });

    await page.keyboard.press("Tab");

    await expect
      .poll(() =>
        page.evaluate(
          () =>
            !(document.activeElement as HTMLElement | null)?.hasAttribute(
              "data-e2e-first-focus",
            ),
        ),
      )
      .toBe(true);

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