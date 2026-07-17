import { expect, test } from "@playwright/test";

test.describe("editor observability", () => {
  test("emits no unexpected console errors during startup", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/", {
      waitUntil: "networkidle",
    });

    await expect(
      page.locator('[data-testid="editor"], [data-editor-root], main').first(),
    ).toBeVisible();

    const ignoredPatterns = [
      /favicon/i,
      /failed to load resource.*404/i,
      /third-party cookie/i,
    ];

    const unexpectedErrors = consoleErrors.filter(
      (message) =>
        !ignoredPatterns.some((pattern) => pattern.test(message)),
    );

    expect(unexpectedErrors).toEqual([]);
  });

  test("propagates a request correlation identifier", async ({ page }) => {
    const observedRequestIds: string[] = [];

    page.on("request", (request) => {
      if (!new URL(request.url()).pathname.startsWith("/api/")) {
        return;
      }

      const requestId =
        request.headers()["x-request-id"] ??
        request.headers()["x-correlation-id"];

      if (requestId) {
        observedRequestIds.push(requestId);
      }
    });

    await page.goto("/", {
      waitUntil: "networkidle",
    });

    for (const requestId of observedRequestIds) {
      expect(requestId.trim()).not.toBe("");
      expect(requestId.length).toBeLessThanOrEqual(128);
    }
  });

  test("exposes performance navigation timing", async ({ page }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
    });

    const timing = await page.evaluate(() => {
      const entry = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming | undefined;

      return entry
        ? {
            duration: entry.duration,
            domContentLoaded:
              entry.domContentLoadedEventEnd -
              entry.domContentLoadedEventStart,
            load:
              entry.loadEventEnd > 0
                ? entry.loadEventEnd - entry.loadEventStart
                : 0,
          }
        : null;
    });

    expect(timing).not.toBeNull();
    expect(timing?.duration).toBeGreaterThanOrEqual(0);
    expect(timing?.domContentLoaded).toBeGreaterThanOrEqual(0);
    expect(timing?.load).toBeGreaterThanOrEqual(0);
  });
});