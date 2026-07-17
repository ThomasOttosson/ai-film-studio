import { expect, test } from "@playwright/test";

test.describe("editor visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
    });

    await page.emulateMedia({
      reducedMotion: "reduce",
    });

    await page.addStyleTag({
      content: `
        *,
        *::before,
        *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          caret-color: transparent !important;
        }
      `,
    });
  });

  test("matches the desktop editor baseline", async ({ page }) => {
    await page.setViewportSize({
      width: 1440,
      height: 900,
    });

    const editorRoot = page.locator(
      '[data-testid="editor"], [data-editor-root], main',
    );

    await expect(editorRoot.first()).toBeVisible();

    await expect(page).toHaveScreenshot("editor-desktop.png", {
      animations: "disabled",
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("matches the mobile editor baseline", async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    const editorRoot = page.locator(
      '[data-testid="editor"], [data-editor-root], main',
    );

    await expect(editorRoot.first()).toBeVisible();

    await expect(page).toHaveScreenshot("editor-mobile.png", {
      animations: "disabled",
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});