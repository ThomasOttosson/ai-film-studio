import { expect, test } from "@playwright/test";

test.describe("editor performance smoke tests", () => {
  test("reaches an interactive state within the release budget", async ({
    page,
  }) => {
    const startedAt = Date.now();

    await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    const editorRoot = page.locator(
      '[data-testid="editor"], [data-editor-root], main',
    );

    await expect(editorRoot.first()).toBeVisible();

    const interactiveDurationMs = Date.now() - startedAt;

    expect(interactiveDurationMs).toBeLessThan(5_000);
  });

  test("avoids excessive layout shift during initial render", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const layoutShifts: number[] = [];

      new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };

          if (!shift.hadRecentInput && typeof shift.value === "number") {
            layoutShifts.push(shift.value);
          }
        }
      }).observe({ type: "layout-shift", buffered: true });

      Object.defineProperty(window, "__editorLayoutShifts", {
        value: layoutShifts,
        configurable: false,
        enumerable: false,
        writable: false,
      });
    });

    await page.goto("/", {
      waitUntil: "networkidle",
    });

    const cumulativeLayoutShift = await page.evaluate(() => {
      const shifts =
        (
          window as typeof window & {
            __editorLayoutShifts?: number[];
          }
        ).__editorLayoutShifts ?? [];

      return shifts.reduce((total, value) => total + value, 0);
    });

    expect(cumulativeLayoutShift).toBeLessThan(0.1);
  });
});