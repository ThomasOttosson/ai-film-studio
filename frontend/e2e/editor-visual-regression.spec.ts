import { expect, test, type Page } from "@playwright/test";

async function prepareEditor(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/", {
    waitUntil: "networkidle",
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

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const editorRoot = page.locator(
    '[data-testid="editor"], [data-editor-root], main',
  );
  await expect(editorRoot.first()).toBeVisible();
}

test.describe("editor visual regression", () => {
  test("matches the desktop editor baseline", async ({ page }) => {
    await page.setViewportSize({
      width: 1440,
      height: 900,
    });

    await prepareEditor(page);

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

    await prepareEditor(page);

    await expect(page).toHaveScreenshot("editor-mobile.png", {
      animations: "disabled",
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});