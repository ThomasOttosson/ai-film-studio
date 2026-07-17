import { expect, test } from "@playwright/test";

test.describe("editor security headers", () => {
  test("serves the application with production security headers", async ({
    page,
  }) => {
    const response = await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    expect(response).not.toBeNull();

    const headers = response?.headers() ?? {};

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBeTruthy();

    const frameProtection =
      headers["content-security-policy"]?.includes("frame-ancestors") ||
      headers["x-frame-options"] === "DENY" ||
      headers["x-frame-options"] === "SAMEORIGIN";

    expect(frameProtection).toBeTruthy();
  });

  test("does not expose framework or server implementation headers", async ({
    page,
  }) => {
    const response = await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    expect(response).not.toBeNull();

    const headers = response?.headers() ?? {};

    expect(headers["x-powered-by"]).toBeUndefined();
    expect(headers["server"]).not.toMatch(
      /express|next\.js|nginx\/\d|apache\/\d|iis\/\d/i,
    );
  });

  test("uses a restrictive content security policy when configured", async ({
    page,
  }) => {
    const response = await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    expect(response).not.toBeNull();

    const policy = response?.headers()["content-security-policy"];

    if (policy) {
      expect(policy).toContain("default-src");
      expect(policy).not.toMatch(/default-src\s+\*/i);
      expect(policy).not.toMatch(/script-src[^;]*\*/i);
      expect(policy).toMatch(/object-src\s+'none'/i);
    }
  });

  test("sets transport security on HTTPS deployments", async ({ page }) => {
    const response = await page.goto("/", {
      waitUntil: "domcontentloaded",
    });

    expect(response).not.toBeNull();

    if (new URL(page.url()).protocol === "https:") {
      const transportSecurity =
        response?.headers()["strict-transport-security"];

      expect(transportSecurity).toBeTruthy();
      expect(transportSecurity).toMatch(/max-age=\d+/i);
    }
  });
});