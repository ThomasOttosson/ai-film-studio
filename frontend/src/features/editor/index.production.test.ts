/**
 * Placement:
 * frontend/src/features/editor/index.production.test.ts
 *
 * Smoke tests for the canonical production entrypoint.
 */

import { describe, expect, it } from "vitest";

import {
  EDITOR_FEATURE_MANIFEST,
  EDITOR_RELEASE,
  getEditorDiagnostics,
} from "./index.production";

describe("editor production entrypoint", () => {
  it("exposes runtime and release metadata from one import path", () => {
    expect(EDITOR_FEATURE_MANIFEST.id).toBe("ai-film-studio-editor");
    expect(EDITOR_RELEASE.ready).toBe(true);
  });

  it("exposes operational diagnostics", () => {
    const diagnostics = getEditorDiagnostics();

    expect(diagnostics.id).toBe(EDITOR_FEATURE_MANIFEST.id);
    expect(diagnostics.ready).toBe(true);
  });
});