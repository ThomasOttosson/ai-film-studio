/**
 * Placement:
 * frontend/src/features/editor/release.test.ts
 *
 * Contract tests for release descriptor.
 */

import { describe, expect, it } from "vitest";

import { EDITOR_RELEASE } from "./release";
import { EDITOR_MEDIA_REALTIME_VERSION } from "./version";
import { EDITOR_READY } from "./ready";

describe("EDITOR_RELEASE", () => {
  it("matches the exported runtime version", () => {
    expect(EDITOR_RELEASE.version).toBe(EDITOR_MEDIA_REALTIME_VERSION);
  });

  it("reflects production readiness", () => {
    expect(EDITOR_RELEASE.ready).toBe(EDITOR_READY.ready);
    expect(EDITOR_RELEASE.stability).toBe("stable");
  });

  it("is immutable", () => {
    expect(Object.isFrozen(EDITOR_RELEASE)).toBe(true);
  });
});