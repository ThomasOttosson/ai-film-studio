/**
 * Placement:
 * frontend/src/features/editor/production.ts
 *
 * Public production metadata entrypoint for diagnostics and deployment tooling.
 */

export {
  EDITOR_MEDIA_REALTIME_VERSION,
  type EditorMediaRealtimeVersion,
} from "./version";

export {
  EDITOR_FEATURE_MANIFEST,
  type EditorFeatureManifest,
} from "./manifest";

export {
  EDITOR_FEATURE_HEALTH,
  type EditorFeatureHealth,
} from "./health";

export {
  EDITOR_READY,
  type EditorReady,
} from "./ready";

export {
  getEditorDiagnostics,
  type EditorDiagnosticsSnapshot,
} from "./diagnostics";