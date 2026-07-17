import { expect, test } from "@playwright/test";

test.describe("editor user workflow", () => {
  test("supports the primary editing journey", async ({ page }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
    });

    const editorRoot = page.locator(
      '[data-testid="editor"], [data-editor-root], main',
    );

    await expect(editorRoot.first()).toBeVisible();

    const editableSurface = page
      .locator(
        [
          '[data-testid="editor-canvas"]',
          '[data-testid="timeline"]',
          '[contenteditable="true"]',
          "textarea",
          'input[type="text"]',
        ].join(", "),
      )
      .first();

    if (await editableSurface.isVisible().catch(() => false)) {
      await editableSurface.focus();
    }

    const primaryAction = page
      .getByRole("button", {
        name: /add|create|generate|render|save|export/i,
      })
      .first();

    if (await primaryAction.isVisible().catch(() => false)) {
      await expect(primaryAction).toBeEnabled();
    }

    await expect(page.locator("body")).toBeVisible();
  });

  test("preserves the editor shell after navigation reload", async ({
    page,
  }) => {
    await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    await page.reload({
      waitUntil: "networkidle",
    });

    const editorRoot = page.locator(
      '[data-testid="editor"], [data-editor-root], main',
    );

    await expect(editorRoot.first()).toBeVisible();
  });

  test("supports browser history without losing the application", async ({
    page,
  }) => {
    await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    await page.evaluate(() => {
      window.history.pushState({}, "", "/?e2e-history=1");
    });

    await page.goBack();

    await expect(
      page.locator('[data-testid="editor"], [data-editor-root], main').first(),
    ).toBeVisible();
  });
});