/**
 * Placement:
 * frontend/src/features/editor/deployment.ts
 *
 * Deployment-safe editor metadata with no UI or browser side effects.
 */

import { getEditorDiagnostics } from "./diagnostics";
import { EDITOR_RELEASE } from "./release";

export function getEditorDeploymentMetadata() {
  const diagnostics = getEditorDiagnostics();

  return Object.freeze({
    name: EDITOR_RELEASE.name,
    version: EDITOR_RELEASE.version,
    stability: EDITOR_RELEASE.stability,
    ready: diagnostics.ready,
    health: diagnostics.health,
    capabilities: diagnostics.capabilities,
  } as const);
}

export type EditorDeploymentMetadata = ReturnType<
  typeof getEditorDeploymentMetadata
>;