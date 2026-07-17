/**
 * Placement:
 * frontend/src/features/editor/diagnostics.ts
 *
 * Stable production diagnostics snapshot for support tooling and runtime checks.
 */

import { EDITOR_FEATURE_HEALTH } from "./health";
import { EDITOR_FEATURE_MANIFEST } from "./manifest";
import { EDITOR_READY } from "./ready";

export interface EditorDiagnosticsSnapshot {
  readonly id: string;
  readonly ready: boolean;
  readonly version: string;
  readonly capabilities: Readonly<Record<string, boolean>>;
  readonly health: typeof EDITOR_FEATURE_HEALTH;
}

const formatVersion = (): string => {
  const { major, minor, patch, channel } = EDITOR_FEATURE_MANIFEST.version;
  return `${major}.${minor}.${patch}-${channel}`;
};

export const getEditorDiagnostics = (): EditorDiagnosticsSnapshot =>
  Object.freeze({
    id: EDITOR_FEATURE_MANIFEST.id,
    ready: EDITOR_READY.ready,
    version: formatVersion(),
    capabilities: EDITOR_FEATURE_MANIFEST.capabilities,
    health: EDITOR_FEATURE_HEALTH,
  });