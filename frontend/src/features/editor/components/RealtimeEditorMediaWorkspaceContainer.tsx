/**
 * Realtime data-backed editor media workspace.
 *
 * Placement:
 * frontend/src/features/editor/components/RealtimeEditorMediaWorkspaceContainer.tsx
 */

import {
  type PropsWithChildren,
  type ReactNode,
} from "react";

import {
  useRealtimeEditorMediaAssets,
  type UseRealtimeEditorMediaAssetsOptions,
} from "../hooks/useRealtimeEditorMediaAssets";
import {
  type EditorMediaAsset,
} from "./MediaPanelLibrary";
import EditorMediaWorkspace from "./EditorMediaWorkspace";

export interface RealtimeEditorMediaWorkspaceContainerProps
  extends PropsWithChildren,
    UseRealtimeEditorMediaAssetsOptions {
  pixelsPerSecond: number;
  timelineOffsetPx?: number;
  targetTrackId?: string;
  initialSelectedAssetId?: string | null;
  disabled?: boolean;
  mediaPanelClassName?: string;
  timelineClassName?: string;
  timelineContent?: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: (
    error: Error,
    retry: () => void,
  ) => ReactNode;
  connectionStatusFallback?: (
    status:
      | "connecting"
      | "closed"
      | "error",
    error: Error | null,
  ) => ReactNode;
  onSelectionChange?: (
    asset: EditorMediaAsset | null,
  ) => void;
  onActivateAsset?: (
    asset: EditorMediaAsset,
  ) => void;
}

export function RealtimeEditorMediaWorkspaceContainer({
  pixelsPerSecond,
  timelineOffsetPx = 0,
  targetTrackId,
  initialSelectedAssetId = null,
  disabled = false,
  mediaPanelClassName,
  timelineClassName,
  timelineContent,
  loadingFallback = (
    <div
      className="editor-media-workspace-status"
      role="status"
    >
      Laddar media...
    </div>
  ),
  errorFallback,
  connectionStatusFallback,
  onSelectionChange,
  onActivateAsset,
  children,
  ...mediaOptions
}: RealtimeEditorMediaWorkspaceContainerProps) {
  const {
    assets,
    isLoading,
    error,
    reload,
    realtimeStatus,
    realtimeError,
  } = useRealtimeEditorMediaAssets(
    mediaOptions,
  );

  if (
    isLoading &&
    assets.length === 0
  ) {
    return <>{loadingFallback}</>;
  }

  if (
    error &&
    assets.length === 0
  ) {
    if (errorFallback) {
      return (
        <>
          {errorFallback(
            error,
            () => {
              void reload();
            },
          )}
        </>
      );
    }

    return (
      <div
        className="editor-media-workspace-status editor-media-workspace-status--error"
        role="alert"
      >
        <p>{error.message}</p>

        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => {
            void reload();
          }}
        >
          Försök igen
        </button>
      </div>
    );
  }

  const connectionStatus =
    realtimeStatus === "open"
      ? null
      : connectionStatusFallback?.(
          realtimeStatus,
          realtimeError,
        ) ?? null;

  return (
    <>
      {connectionStatus}

      <EditorMediaWorkspace
        assets={assets}
        pixelsPerSecond={pixelsPerSecond}
        timelineOffsetPx={timelineOffsetPx}
        targetTrackId={targetTrackId}
        initialSelectedAssetId={
          initialSelectedAssetId
        }
        disabled={disabled}
        mediaPanelClassName={
          mediaPanelClassName
        }
        timelineClassName={
          timelineClassName
        }
        timelineContent={timelineContent}
        onSelectionChange={
          onSelectionChange
        }
        onActivateAsset={
          onActivateAsset
        }
      >
        {children}
      </EditorMediaWorkspace>
    </>
  );
}

export default RealtimeEditorMediaWorkspaceContainer;