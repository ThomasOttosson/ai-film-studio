/**
 * Placement:
 * frontend/src/features/editor/diagnostics.test.ts
 *
 * Production contract tests for editor release metadata and diagnostics.
 */

import { describe, expect, it } from "vitest";

import { getEditorDiagnostics } from "./diagnostics";
import { EDITOR_FEATURE_HEALTH } from "./health";
import { EDITOR_FEATURE_MANIFEST } from "./manifest";
import { EDITOR_READY } from "./ready";

describe("editor production diagnostics", () => {
  it("reports the editor as ready when required capabilities are enabled", () => {
    const diagnostics = getEditorDiagnostics();

    expect(diagnostics.ready).toBe(true);
    expect(diagnostics.ready).toBe(EDITOR_READY.ready);
    expect(diagnostics.health).toBe(EDITOR_FEATURE_HEALTH);
  });

  it("exposes a stable manifest identity and semantic version", () => {
    const diagnostics = getEditorDiagnostics();

    expect(diagnostics.id).toBe("ai-film-studio-editor");
    expect(diagnostics.id).toBe(EDITOR_FEATURE_MANIFEST.id);
    expect(diagnostics.version).toMatch(/^\d+\.\d+\.\d+-[a-z]+$/);
  });

  it("includes all required production capabilities", () => {
    const diagnostics = getEditorDiagnostics();

    expect(diagnostics.capabilities).toMatchObject({
      mediaTimeline: true,
      dragAndDrop: true,
      persistence: true,
      aiJobRealtime: true,
      websocketReconnect: true,
      progressTracking: true,
      accessibleAnnouncements: true,
    });
  });

  it("returns an immutable top-level snapshot", () => {
    const diagnostics = getEditorDiagnostics();

    expect(Object.isFrozen(diagnostics)).toBe(true);
  });
});