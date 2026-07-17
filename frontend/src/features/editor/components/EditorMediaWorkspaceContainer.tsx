/**
 * Data-backed editor media workspace with loading and error states.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaWorkspaceContainer.tsx
 */

import {
  type PropsWithChildren,
  type ReactNode,
} from "react";

import {
  useEditorMediaAssets,
  type UseEditorMediaAssetsOptions,
} from "../hooks/useEditorMediaAssets";
import {
  type EditorMediaAsset,
} from "./MediaPanelLibrary";
import EditorMediaWorkspace from "./EditorMediaWorkspace";

export interface EditorMediaWorkspaceContainerProps
  extends PropsWithChildren,
    UseEditorMediaAssetsOptions {
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
  onSelectionChange?: (
    asset: EditorMediaAsset | null,
  ) => void;
  onActivateAsset?: (
    asset: EditorMediaAsset,
  ) => void;
}

export function EditorMediaWorkspaceContainer({
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
  onSelectionChange,
  onActivateAsset,
  children,
  endpoint,
  projectId,
  enabled,
  requestInit,
}: EditorMediaWorkspaceContainerProps) {
  const {
    assets,
    isLoading,
    error,
    reload,
  } = useEditorMediaAssets({
    endpoint,
    projectId,
    enabled,
    requestInit,
  });

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

  return (
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
      onActivateAsset={onActivateAsset}
    >
      {children}
    </EditorMediaWorkspace>
  );
}

export default EditorMediaWorkspaceContainer;