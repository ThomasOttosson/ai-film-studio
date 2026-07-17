/**
 * Editor media realtime public API.
 *
 * Placement:
 * frontend/src/features/editor/realtime/index.ts
 */

export {
  EditorMediaRealtimeBoundary,
  type EditorMediaRealtimeBoundaryProps,
} from "../components/EditorMediaRealtimeBoundary";

export {
  EditorMediaRealtimeConnectionBanner,
  type EditorMediaRealtimeConnectionBannerProps,
} from "../components/EditorMediaConnectionBanner";

export {
  EditorMediaRealtimeErrorFallback,
  type EditorMediaRealtimeErrorFallbackProps,
} from "../components/EditorMediaRealtimeErrorFallback";

export {
  EditorMediaRealtimeFallback,
  type EditorMediaRealtimeFallbackProps,
  type EditorMediaRealtimeFallbackStatus,
} from "../components/EditorMediaRealtimeFallback";

export {
  EditorMediaRealtimeLoadingFallback,
  type EditorMediaRealtimeLoadingFallbackProps,
} from "../components/EditorMediaRealtimeLoadingFallback";

export {
  EditorMediaRealtimeProvider,
  useEditorMediaRealtimeContext,
  type EditorMediaRealtimeContextValue,
  type EditorMediaRealtimeProviderProps,
} from "../components/EditorMediaRealtimeProvider";

export {
  EditorMediaRealtimeState,
  type EditorMediaRealtimeStateProps,
} from "../components/EditorMediaRealtimeState";

export {
  EditorMediaRealtimeStatus,
  type EditorMediaRealtimeStatusProps,
} from "../components/EditorMediaRealtimeStatus";

export {
  RealtimeEditorMediaWorkspace,
  type RealtimeEditorMediaWorkspaceProps,
} from "../components/RealtimeEditorMediaWorkspace";

export {
  RealtimeEditorMediaWorkspaceContainer,
  type RealtimeEditorMediaWorkspaceContainerProps,
} from "../components/RealtimeEditorMediaWorkspaceContainer";

export {
  useEditorMediaRealtime,
  type EditorMediaRealtimeOptions,
} from "../hooks/useEditorMediaRealtime";

export {
  useEditorMediaRealtimeStatus,
  type UseEditorMediaRealtimeStatusOptions,
} from "../hooks/useEditorMediaRealtimeStatus";

export {
  useRealtimeEditorMediaAssets,
  type UseRealtimeEditorMediaAssetsOptions,
} from "../hooks/useRealtimeEditorMediaAssets";

export {
  createEditorMediaRealtimeStatusSnapshot,
  getEditorMediaRealtimeStatusFromReadyState,
  isEditorMediaRealtimeAvailable,
  type EditorMediaRealtimeStatus as EditorMediaRealtimeConnectionStatus,
  type EditorMediaRealtimeStatusSnapshot,
} from "../utils/editorMediaRealtimeStatus";