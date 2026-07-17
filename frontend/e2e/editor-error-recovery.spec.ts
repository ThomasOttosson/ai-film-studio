import { expect, test } from "@playwright/test";

test.describe("editor error recovery", () => {
  test("keeps the application shell available after an API failure", async ({
    page,
  }) => {
    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "service_unavailable",
          message: "Temporary test failure",
        }),
      });
    });

    await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("body")).toBeVisible();

    const editorShell = page.locator(
      '[data-testid="editor"], [data-editor-root], main',
    );

    await expect(editorShell.first()).toBeVisible();
  });

  test("does not render raw stack traces to users", async ({ page }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
    });

    const visibleText = await page.locator("body").innerText();

    expect(visibleText).not.toMatch(/\bat\s+\S+\s+\(.+:\d+:\d+\)/);
    expect(visibleText).not.toContain("Unhandled Runtime Error");
  });

  test("can recover after returning online", async ({ page, context }) => {
    await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    await context.setOffline(true);
    await page.waitForTimeout(250);
    await context.setOffline(false);

    await page.reload({
      waitUntil: "domcontentloaded",
    });

    const editorShell = page.locator(
      '[data-testid="editor"], [data-editor-root], main',
    );

    await expect(editorShell.first()).toBeVisible();
  });
});