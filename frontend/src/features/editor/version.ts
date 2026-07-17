/**
 * Placement:
 * frontend/src/features/editor/version.ts
 *
 * Immutable version metadata for the completed editor realtime module.
 */

export const EDITOR_MEDIA_REALTIME_VERSION = Object.freeze({
  major: 1,
  minor: 0,
  patch: 0,
  channel: "production",
  codename: "editor-realtime",
} as const);

export type EditorMediaRealtimeVersion =
  typeof EDITOR_MEDIA_REALTIME_VERSION;