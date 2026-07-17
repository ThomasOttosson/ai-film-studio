/**
 * Placement:
 * frontend/src/features/editor/editor.smoke.test.ts
 *
 * Minimal production smoke test for the editor release surface.
 */

import { describe, expect, it } from "vitest";

import { getEditorDeploymentMetadata } from "./deployment.public";
import {
  EDITOR_MEDIA_REALTIME_VERSION,
  EDITOR_READY,
  EDITOR_RELEASE,
} from "./release.public";

describe("editor production smoke test", () => {
  it("exposes a deployable, ready, stable release", () => {
    const deployment = getEditorDeploymentMetadata();

    expect(EDITOR_READY.ready).toBe(true);
    expect(EDITOR_RELEASE.stability).toBe("stable");
    expect(EDITOR_RELEASE.version).toBe(
      EDITOR_MEDIA_REALTIME_VERSION,
    );

    expect(deployment.ready).toBe(true);
    expect(deployment.version).toBe(EDITOR_RELEASE.version);
    expect(deployment.health.ready).toBe(true);
  });

  it("reports all required realtime capabilities", () => {
    const { capabilities } = getEditorDeploymentMetadata();

    expect(capabilities.aiJobRealtime).toBe(true);
    expect(capabilities.websocketReconnect).toBe(true);
  });
});