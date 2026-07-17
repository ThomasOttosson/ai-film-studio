/**
 * Placement:
 * frontend/src/features/editor/deployment.test.ts
 *
 * Deployment metadata contract tests.
 */

import { describe, expect, it } from "vitest";

import { getEditorDeploymentMetadata } from "./deployment";
import { EDITOR_RELEASE } from "./release";

describe("getEditorDeploymentMetadata", () => {
  it("returns deployment-safe release metadata", () => {
    const metadata = getEditorDeploymentMetadata();

    expect(metadata.name).toBe(EDITOR_RELEASE.name);
    expect(metadata.version).toBe(EDITOR_RELEASE.version);
    expect(metadata.stability).toBe("stable");
    expect(metadata.ready).toBe(true);
  });

  it("includes operational health and capabilities", () => {
    const metadata = getEditorDeploymentMetadata();

    expect(metadata.health.ready).toBe(true);
    expect(metadata.capabilities.aiJobRealtime).toBe(true);
    expect(metadata.capabilities.websocketReconnect).toBe(true);
  });

  it("returns an immutable snapshot", () => {
    expect(Object.isFrozen(getEditorDeploymentMetadata())).toBe(true);
  });
});