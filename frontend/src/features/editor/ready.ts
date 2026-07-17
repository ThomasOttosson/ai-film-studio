/**
 * Placement:
 * frontend/src/features/editor/ready.ts
 *
 * Final readiness flag for production integrations.
 */

import { EDITOR_FEATURE_HEALTH } from "./health";
import { EDITOR_FEATURE_MANIFEST } from "./manifest";

export const EDITOR_READY = Object.freeze({
  ready:
    EDITOR_FEATURE_HEALTH.ready &&
    EDITOR_FEATURE_MANIFEST.capabilities.aiJobRealtime,
  manifest: EDITOR_FEATURE_MANIFEST.id,
  version: EDITOR_FEATURE_MANIFEST.version,
} as const);

export type EditorReady = typeof EDITOR_READY;