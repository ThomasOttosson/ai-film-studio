/**
 * Stateful media workspace that wires library selection, activation,
 * and timeline drag-and-drop into a single editor component.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaWorkspace.tsx
 */

import {
  type PropsWithChildren,
  type ReactNode,
} from "react";

import {
  useMediaLibrarySelection,
} from "../hooks/useMediaLibrarySelection";
import {
  type EditorMediaAsset,
} from "./MediaPanelLibrary";
import EditorMediaDragAndDrop from "./EditorMediaDragAndDrop";

export interface EditorMediaWorkspaceProps
  extends PropsWithChildren {
  assets: EditorMediaAsset[];
  pixelsPerSecond: number;
  timelineOffsetPx?: number;
  targetTrackId?: string;
  initialSelectedAssetId?: string | null;
  disabled?: boolean;
  mediaPanelClassName?: string;
  timelineClassName?: string;
  timelineContent?: ReactNode;
  onSelectionChange?: (
    asset: EditorMediaAsset | null,
  ) => void;
  onActivateAsset?: (
    asset: EditorMediaAsset,
  ) => void;
}

export function EditorMediaWorkspace({
  assets,
  pixelsPerSecond,
  timelineOffsetPx = 0,
  targetTrackId,
  initialSelectedAssetId = null,
  disabled = false,
  mediaPanelClassName,
  timelineClassName,
  timelineContent,
  children,
  onSelectionChange,
  onActivateAsset,
}: EditorMediaWorkspaceProps) {
  const {
    selectedAssetId,
    selectAsset,
    activateAsset,
  } = useMediaLibrarySelection(
    assets,
    {
      initialSelectedAssetId,
      onSelectionChange,
      onActivateAsset,
    },
  );

  return (
    <EditorMediaDragAndDrop
      assets={assets}
      selectedAssetId={selectedAssetId}
      pixelsPerSecond={pixelsPerSecond}
      timelineOffsetPx={timelineOffsetPx}
      targetTrackId={targetTrackId}
      disabled={disabled}
      mediaPanelClassName={
        mediaPanelClassName
      }
      timelineClassName={
        timelineClassName
      }
      timelineContent={timelineContent}
      onSelectAsset={selectAsset}
      onOpenAsset={activateAsset}
    >
      {children}
    </EditorMediaDragAndDrop>
  );
}

export default EditorMediaWorkspace;