import { expect, test } from "@playwright/test";

test.describe("editor realtime smoke tests", () => {
  test("connects without uncaught websocket errors", async ({ page }) => {
    const websocketErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("websocket", (socket) => {
      socket.on("socketerror", (error) => {
        websocketErrors.push(String(error));
      });
    });

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.goto("/", {
      waitUntil: "networkidle",
    });

    await expect(
      page.locator('[data-testid="editor"], [data-editor-root], main').first(),
    ).toBeVisible();

    expect(websocketErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("keeps the editor usable after websocket disconnect", async ({
    page,
  }) => {
    await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    await page.evaluate(() => {
      const NativeWebSocket = window.WebSocket;

      Object.defineProperty(window, "WebSocket", {
        configurable: true,
        value: class TestWebSocket extends NativeWebSocket {
          constructor(url: string | URL, protocols?: string | string[]) {
            super(url, protocols);

            this.addEventListener(
              "open",
              () => {
                this.close(1012, "Service restart");
              },
              { once: true },
            );
          }
        },
      });
    });

    await page.reload({
      waitUntil: "domcontentloaded",
    });

    const editorRoot = page.locator(
      '[data-testid="editor"], [data-editor-root], main',
    );

    await expect(editorRoot.first()).toBeVisible();
    await expect(page.locator("body")).toBeVisible();
  });

  test("does not create an uncontrolled reconnect loop", async ({ page }) => {
    let websocketConnections = 0;

    page.on("websocket", () => {
      websocketConnections += 1;
    });

    await page.goto("/", {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(2_000);

    expect(websocketConnections).toBeLessThanOrEqual(5);
  });
});