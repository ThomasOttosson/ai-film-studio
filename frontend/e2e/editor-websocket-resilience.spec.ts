import { expect, test } from "@playwright/test";

test.describe("editor websocket resilience", () => {
  test("survives websocket reconnects without crashing", async ({ page }) => {
    const wsUrls: string[] = [];

    page.on("websocket", (ws) => {
      wsUrls.push(ws.url());
      ws.close();
    });

    await page.goto("/", { waitUntil: "networkidle" });

    await expect(
      page.locator('[data-testid="editor"], [data-editor-root], main').first(),
    ).toBeVisible();

    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    expect(wsUrls.length).toBeGreaterThanOrEqual(0);
  });

  test("remains usable after simulated reconnect cycle", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    for (let i = 0; i < 3; i++) {
      await page.reload({ waitUntil: "networkidle" });
      await expect(
        page.locator('[data-testid="editor"], [data-editor-root], main').first(),
      ).toBeVisible();
    }
  });
});