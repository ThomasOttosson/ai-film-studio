import { expect, test } from "@playwright/test";

test.describe("editor release surface", () => {
  test("loads without uncaught page errors", async ({ page }) => {
    const pageErrors: Error[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    const response = await page.goto("/", {
      waitUntil: "networkidle",
    });

    expect(response?.ok()).toBe(true);
    await expect(page.locator("body")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("renders a usable editor root", async ({ page }) => {
    await page.goto("/");

    const editorRoot = page.locator(
      '[data-testid="editor"], [data-editor-root], main',
    );

    await expect(editorRoot.first()).toBeVisible();
  });
});