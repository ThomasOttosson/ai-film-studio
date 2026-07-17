/**
 * Placement:
 * frontend/src/features/editor/manifest.ts
 *
 * Production manifest for diagnostics, feature discovery, and release checks.
 */

import { EDITOR_MEDIA_REALTIME_VERSION } from "./version";

export const EDITOR_FEATURE_MANIFEST = Object.freeze({
  id: "ai-film-studio-editor",
  name: "AI Film Studio Editor",
  version: EDITOR_MEDIA_REALTIME_VERSION,
  capabilities: Object.freeze({
    mediaTimeline: true,
    dragAndDrop: true,
    persistence: true,
    aiJobRealtime: true,
    websocketReconnect: true,
    progressTracking: true,
    accessibleAnnouncements: true,
  }),
  entrypoints: Object.freeze({
    editor: "./editor.public",
    components: "./components/index.public",
    realtime: "./realtime/index.public",
    styles: "./styles/editorMediaRealtimeBundle.css",
  }),
} as const);

export type EditorFeatureManifest = typeof EDITOR_FEATURE_MANIFEST;