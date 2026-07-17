/**
 * Placement:
 * frontend/src/features/editor/production.test.ts
 *
 * Barrel export contract tests for production entrypoint.
 */

import { describe, expect, it } from "vitest";

import {
  EDITOR_FEATURE_HEALTH,
  EDITOR_FEATURE_MANIFEST,
  EDITOR_MEDIA_REALTIME_VERSION,
  EDITOR_READY,
  getEditorDiagnostics,
} from "./production";

describe("production entrypoint", () => {
  it("re-exports production metadata", () => {
    expect(EDITOR_MEDIA_REALTIME_VERSION.major).toBeTypeOf("number");
    expect(EDITOR_FEATURE_MANIFEST.id).toBe("ai-film-studio-editor");
    expect(EDITOR_FEATURE_HEALTH.ready).toBe(true);
    expect(EDITOR_READY.ready).toBe(true);
  });

  it("provides diagnostics through the barrel", () => {
    const snapshot = getEditorDiagnostics();
    expect(snapshot.ready).toBe(true);
    expect(snapshot.id).toBe(EDITOR_FEATURE_MANIFEST.id);
  });
});