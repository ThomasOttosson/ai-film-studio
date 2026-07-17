import { expect, test } from "@playwright/test";

test.describe("editor concurrent sessions", () => {
  test("supports multiple isolated browser contexts", async ({ browser }) => {
    const contexts = await Promise.all(
      Array.from({ length: 3 }, () => browser.newContext()),
    );

    try {
      const pages = await Promise.all(
        contexts.map(async (context) => {
          const page = await context.newPage();

          await page.goto("/", {
            waitUntil: "domcontentloaded",
          });

          return page;
        }),
      );

      await Promise.all(
        pages.map(async (page) => {
          const editorRoot = page.locator(
            '[data-testid="editor"], [data-editor-root], main',
          );

          await expect(editorRoot.first()).toBeVisible();
          await expect(page.locator("body")).toBeVisible();
        }),
      );
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });

  test("keeps startup latency within the concurrent-session budget", async ({
    browser,
  }) => {
    const sessionCount = 4;
    const maximumStartupTimeMs = 15_000;

    const startupTimes = await Promise.all(
      Array.from({ length: sessionCount }, async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const startedAt = Date.now();

        try {
          await page.goto("/", {
            waitUntil: "domcontentloaded",
            timeout: maximumStartupTimeMs,
          });

          await expect(
            page
              .locator('[data-testid="editor"], [data-editor-root], main')
              .first(),
          ).toBeVisible({
            timeout: maximumStartupTimeMs,
          });

          return Date.now() - startedAt;
        } finally {
          await context.close();
        }
      }),
    );

    for (const startupTime of startupTimes) {
      expect(startupTime).toBeLessThan(maximumStartupTimeMs);
    }
  });
});