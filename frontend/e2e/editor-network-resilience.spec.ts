import { expect, test } from "@playwright/test";

test.describe("editor network resilience", () => {
  test("remains usable when non-document requests fail", async ({ page }) => {
    await page.route("**/*", async (route) => {
      const request = route.request();

      if (
        request.resourceType() !== "document" &&
        request.url().includes("/api/")
      ) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });

    await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    const editorRoot = page.locator(
      '[data-testid="editor"], [data-editor-root], main',
    );

    await expect(editorRoot.first()).toBeVisible();
    await expect(page.locator("body")).toBeVisible();
  });

  test("does not issue uncontrolled duplicate API requests on startup", async ({
    page,
  }) => {
    const requestCounts = new Map<string, number>();

    page.on("request", (request) => {
      const url = new URL(request.url());

      if (!url.pathname.startsWith("/api/")) {
        return;
      }

      const key = `${request.method()} ${url.pathname}`;
      requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);
    });

    await page.goto("/", {
      waitUntil: "networkidle",
    });

    for (const [requestKey, count] of requestCounts) {
      expect(
        count,
        `${requestKey} exceeded the startup request budget`,
      ).toBeLessThanOrEqual(5);
    }
  });

  test("avoids unhandled promise rejections during startup", async ({
    page,
  }) => {
    const unhandledRejections: string[] = [];

    await page.addInitScript(() => {
      window.addEventListener("unhandledrejection", (event) => {
        const reason =
          event.reason instanceof Error
            ? event.reason.message
            : String(event.reason);

        (
          window as typeof window & {
            __editorUnhandledRejections?: string[];
          }
        ).__editorUnhandledRejections ??= [];

        (
          window as typeof window & {
            __editorUnhandledRejections: string[];
          }
        ).__editorUnhandledRejections.push(reason);
      });
    });

    await page.goto("/", {
      waitUntil: "networkidle",
    });

    unhandledRejections.push(
      ...(await page.evaluate(
        () =>
          (
            window as typeof window & {
              __editorUnhandledRejections?: string[];
            }
          ).__editorUnhandledRejections ?? [],
      )),
    );

    expect(unhandledRejections).toEqual([]);
  });
});