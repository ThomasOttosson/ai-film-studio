/**
 * Placement:
 * frontend/src/features/editor/release.public.test.ts
 *
 * Public release entrypoint contract tests.
 */

import { describe, expect, it } from "vitest";

import {
  EDITOR_MEDIA_REALTIME_VERSION,
  EDITOR_READY,
  EDITOR_RELEASE,
} from "./release.public";

describe("release public entrypoint", () => {
  it("exports a consistent release contract", () => {
    expect(EDITOR_RELEASE.version).toBe(EDITOR_MEDIA_REALTIME_VERSION);
    expect(EDITOR_RELEASE.ready).toBe(EDITOR_READY.ready);
    expect(EDITOR_RELEASE.stability).toBe("stable");
  });

  it("keeps release metadata immutable", () => {
    expect(Object.isFrozen(EDITOR_RELEASE)).toBe(true);
  });
});