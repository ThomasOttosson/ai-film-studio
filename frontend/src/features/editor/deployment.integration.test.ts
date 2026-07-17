/**
 * Placement:
 * frontend/src/features/editor/deployment.integration.test.ts
 *
 * Integration contract between release, diagnostics, and deployment metadata.
 */

import { describe, expect, it } from "vitest";

import { getEditorDeploymentMetadata } from "./deployment";
import { getEditorDiagnostics } from "./diagnostics";
import { EDITOR_RELEASE } from "./release";

describe("editor deployment integration", () => {
  it("keeps release and diagnostics metadata aligned", () => {
    const deployment = getEditorDeploymentMetadata();
    const diagnostics = getEditorDiagnostics();

    expect(deployment.name).toBe(EDITOR_RELEASE.name);
    expect(deployment.version).toBe(EDITOR_RELEASE.version);
    expect(deployment.ready).toBe(diagnostics.ready);
    expect(deployment.health).toEqual(diagnostics.health);
    expect(deployment.capabilities).toEqual(diagnostics.capabilities);
  });

  it("produces stable snapshots across calls", () => {
    expect(getEditorDeploymentMetadata()).toEqual(
      getEditorDeploymentMetadata(),
    );
  });
});