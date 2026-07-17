import { expect, test } from "@playwright/test";

test.describe("editor security smoke tests", () => {
  test("does not expose sensitive values in rendered markup", async ({
    page,
  }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
    });

    const markup = await page.locator("html").innerHTML();

    const forbiddenPatterns = [
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
      /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{8,}["']/i,
      /sk-[a-z0-9]{20,}/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(markup).not.toMatch(pattern);
    }
  });

  test("prevents javascript URLs on interactive links", async ({ page }) => {
    await page.goto("/");

    const unsafeLinks = page.locator('a[href^="javascript:"]');

    await expect(unsafeLinks).toHaveCount(0);
  });

  test("does not create mixed-content requests", async ({ page }) => {
    const insecureRequests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();

      if (
        page.url().startsWith("https://") &&
        url.startsWith("http://") &&
        !url.startsWith("http://localhost") &&
        !url.startsWith("http://127.0.0.1")
      ) {
        insecureRequests.push(url);
      }
    });

    await page.goto("/", {
      waitUntil: "networkidle",
    });

    expect(insecureRequests).toEqual([]);
  });
});