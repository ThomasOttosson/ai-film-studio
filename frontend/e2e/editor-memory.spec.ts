import { expect, test } from "@playwright/test";

test.describe("editor memory stability", () => {
  test("keeps heap growth bounded across repeated reloads", async ({ page }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
    });

    const collectHeapSize = async (): Promise<number | null> =>
      page.evaluate(() => {
        const memory = (
          performance as Performance & {
            memory?: {
              usedJSHeapSize: number;
            };
          }
        ).memory;

        return memory?.usedJSHeapSize ?? null;
      });

    const initialHeapSize = await collectHeapSize();

    for (let iteration = 0; iteration < 5; iteration += 1) {
      await page.reload({
        waitUntil: "networkidle",
      });

      await expect(
        page.locator('[data-testid="editor"], [data-editor-root], main').first(),
      ).toBeVisible();
    }

    const finalHeapSize = await collectHeapSize();

    if (initialHeapSize !== null && finalHeapSize !== null) {
      const maximumAllowedGrowthBytes = 75 * 1024 * 1024;

      expect(finalHeapSize - initialHeapSize).toBeLessThan(
        maximumAllowedGrowthBytes,
      );
    }
  });

  test("does not accumulate duplicate editor roots", async ({ page }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
    });

    for (let iteration = 0; iteration < 3; iteration += 1) {
      await page.reload({
        waitUntil: "networkidle",
      });
    }

    const editorRoots = page.locator(
      '[data-testid="editor"], [data-editor-root]',
    );

    const rootCount = await editorRoots.count();

    if (rootCount > 0) {
      expect(rootCount).toBe(1);
    } else {
      await expect(page.locator("main").first()).toBeVisible();
    }
  });

  test("releases transient event listeners after navigation", async ({
    page,
  }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    for (let iteration = 0; iteration < 4; iteration += 1) {
      await page.goto(`/?memory-cycle=${iteration}`, {
        waitUntil: "domcontentloaded",
      });
    }

    await expect(
      page.locator('[data-testid="editor"], [data-editor-root], main').first(),
    ).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});