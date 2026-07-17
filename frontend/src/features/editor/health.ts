/**
 * Placement:
 * frontend/src/features/editor/health.ts
 *
 * Lightweight health metadata for production diagnostics.
 */

import { EDITOR_FEATURE_MANIFEST } from "./manifest";

export const EDITOR_FEATURE_HEALTH = Object.freeze({
  manifest: EDITOR_FEATURE_MANIFEST.id,
  ready: true,
  realtime: true,
  websocket: true,
  version: EDITOR_FEATURE_MANIFEST.version,
  generatedAt: "production",
} as const);

export type EditorFeatureHealth = typeof EDITOR_FEATURE_HEALTH;