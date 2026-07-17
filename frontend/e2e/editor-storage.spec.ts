import { expect, test } from "@playwright/test";

test.describe("editor storage resilience", () => {
  test("starts when local storage is unavailable", async ({ browser }) => {
    const context = await browser.newContext();

    await context.addInitScript(() => {
      const deny = () => {
        throw new DOMException("Storage access denied", "SecurityError");
      };

      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get: deny,
      });
    });

    const page = await context.newPage();

    try {
      await page.goto("/", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.locator('[data-testid="editor"], [data-editor-root], main').first(),
      ).toBeVisible();

      await expect(page.locator("body")).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("starts when session storage is unavailable", async ({ browser }) => {
    const context = await browser.newContext();

    await context.addInitScript(() => {
      const deny = () => {
        throw new DOMException("Storage access denied", "SecurityError");
      };

      Object.defineProperty(window, "sessionStorage", {
        configurable: true,
        get: deny,
      });
    });

    const page = await context.newPage();

    try {
      await page.goto("/", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.locator('[data-testid="editor"], [data-editor-root], main').first(),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("does not persist obvious secrets in browser storage", async ({
    page,
  }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
    });

    const storedValues = await page.evaluate(() => {
      const collect = (storage: Storage): string[] =>
        Array.from({ length: storage.length }, (_, index) => {
          const key = storage.key(index) ?? "";
          return `${key}=${storage.getItem(key) ?? ""}`;
        });

      return [...collect(localStorage), ...collect(sessionStorage)];
    });

    const serializedStorage = storedValues.join("\n");

    expect(serializedStorage).not.toMatch(
      /(?:api[_-]?key|secret|private[_-]?key|authorization)\s*[:=]\s*\S+/i,
    );
  });
});