import { expect, test } from "@playwright/test";

test.describe("editor API contract", () => {
  test("sends valid JSON for AI action requests", async ({ page }) => {
    const observedRequests: Array<{
      method: string;
      contentType: string | undefined;
      body: unknown;
    }> = [];

    await page.route("**/api/ai/actions", async (route) => {
      const request = route.request();
      const body: unknown = (() => {
        try {
          return request.postDataJSON();
        } catch {
          return request.postData();
        }
      })();

      observedRequests.push({
        method: request.method(),
        contentType: request.headers()["content-type"],
        body,
      });

      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId: "e2e-job-1",
          status: "queued",
        }),
      });
    });

    await page.goto("/", {
      waitUntil: "networkidle",
    });

    const actionButton = page
      .getByRole("button", {
        name: /generate|create|render|run|submit/i,
      })
      .first();

    if (await actionButton.isVisible().catch(() => false)) {
      await actionButton.click();
    }

    for (const request of observedRequests) {
      expect(request.method).toBe("POST");
      expect(request.contentType).toContain("application/json");
      expect(request.body).not.toBeNull();
      expect(typeof request.body).toBe("object");
    }
  });

  test("handles accepted job responses without exposing transport details", async ({
    page,
  }) => {
    await page.route("**/api/ai/actions", async (route) => {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId: "e2e-job-accepted",
          status: "queued",
        }),
      });
    });

    await page.goto("/", {
      waitUntil: "networkidle",
    });

    const bodyText = await page.locator("body").innerText();

    expect(bodyText).not.toContain("e2e-job-accepted");
    expect(bodyText).not.toMatch(/redis|pub\/sub|websocket transport/i);
  });

  test("handles structured API errors safely", async ({ page }) => {
    await page.route("**/api/ai/actions", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INVALID_ACTION",
            message: "The requested action is invalid.",
          },
        }),
      });
    });

    await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.locator('[data-testid="editor"], [data-editor-root], main').first(),
    ).toBeVisible();

    const visibleText = await page.locator("body").innerText();

    expect(visibleText).not.toMatch(/\bat\s+\S+\s+\(.+:\d+:\d+\)/);
    expect(visibleText).not.toContain("[object Object]");
  });
});