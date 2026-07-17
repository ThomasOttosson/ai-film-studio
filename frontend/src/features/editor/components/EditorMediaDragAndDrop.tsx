/**
 * Editor-level drag-and-drop integration for media assets and timeline clips.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaDragAndDrop.tsx
 */

import {
  type PropsWithChildren,
  type ReactNode,
} from "react";

import {
  type EditorMediaAsset,
} from "./MediaPanelLibrary";
import MediaPanelLibrary from "./MediaPanelLibrary";
import TimelineMediaDropTarget from "./TimelineMediaDropTarget";

export interface EditorMediaDragAndDropProps
  extends PropsWithChildren {
  assets: EditorMediaAsset[];
  selectedAssetId?: string | null;
  pixelsPerSecond: number;
  timelineOffsetPx?: number;
  targetTrackId?: string;
  disabled?: boolean;
  mediaPanelClassName?: string;
  timelineClassName?: string;
  timelineContent?: ReactNode;
  onSelectAsset?: (
    asset: EditorMediaAsset,
  ) => void;
  onOpenAsset?: (
    asset: EditorMediaAsset,
  ) => void;
}

export function EditorMediaDragAndDrop({
  assets,
  selectedAssetId = null,
  pixelsPerSecond,
  timelineOffsetPx = 0,
  targetTrackId,
  disabled = false,
  mediaPanelClassName,
  timelineClassName,
  timelineContent,
  children,
  onSelectAsset,
  onOpenAsset,
}: EditorMediaDragAndDropProps) {
  return (
    <div className="editor-media-drag-and-drop">
      <aside className="editor-media-drag-and-drop__library">
        <MediaPanelLibrary
          assets={assets}
          selectedAssetId={selectedAssetId}
          className={mediaPanelClassName}
          disabled={disabled}
          onSelectAsset={onSelectAsset}
          onOpenAsset={onOpenAsset}
        />
      </aside>

      <main className="editor-media-drag-and-drop__workspace">
        {children}

        <TimelineMediaDropTarget
          className={timelineClassName}
          trackId={targetTrackId}
          pixelsPerSecond={pixelsPerSecond}
          timelineOffsetPx={timelineOffsetPx}
          disabled={disabled}
        >
          {timelineContent}
        </TimelineMediaDropTarget>
      </main>
    </div>
  );
}

export default EditorMediaDragAndDrop;