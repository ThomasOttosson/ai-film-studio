/**
 * Timeline drop surface that converts dropped media into timeline clip actions.
 *
 * Placement:
 * frontend/src/features/editor/components/TimelineMediaDropTarget.tsx
 */

import {
  type PropsWithChildren,
  useCallback,
} from "react";

import {
  type MediaDragPayload,
} from "../lib/mediaDragPayload";
import {
  type MediaDropPosition,
  useMediaDropTarget,
} from "../hooks/useMediaDropTarget";
import { useTimeline } from "../state/TimelineProvider";

export interface TimelineMediaDropTargetProps
  extends PropsWithChildren {
  className?: string;
  trackId?: string;
  pixelsPerSecond: number;
  timelineOffsetPx?: number;
  disabled?: boolean;
  defaultImageDurationMs?: number;
}

function createClipId(): string {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `clip-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function resolveDurationMs(
  payload: MediaDragPayload,
  defaultImageDurationMs: number,
): number {
  if (
    typeof payload.durationMs === "number" &&
    Number.isFinite(payload.durationMs) &&
    payload.durationMs > 0
  ) {
    return payload.durationMs;
  }

  return payload.kind === "image"
    ? defaultImageDurationMs
    : 5_000;
}

export function TimelineMediaDropTarget({
  children,
  className,
  trackId,
  pixelsPerSecond,
  timelineOffsetPx = 0,
  disabled = false,
  defaultImageDurationMs = 5_000,
}: TimelineMediaDropTargetProps) {
  const { project, dispatch } = useTimeline();

  const handleDrop = useCallback(
    (
      payload: MediaDragPayload,
      position: MediaDropPosition,
    ) => {
      const targetTrackId =
        trackId ??
        project.selection.trackIds[0] ??
        project.tracks[0]?.id;

      if (!targetTrackId) {
        return;
      }

      const safePixelsPerSecond = Math.max(
        pixelsPerSecond,
        0.001,
      );

      const startMs = Math.max(
        0,
        Math.round(
          ((position.offsetX - timelineOffsetPx) /
            safePixelsPerSecond) *
            1_000,
        ),
      );

      const durationMs = resolveDurationMs(
        payload,
        defaultImageDurationMs,
      );

      dispatch({
        type: "ADD_CLIP",
        trackId: targetTrackId,
        clip: {
          id: createClipId(),
          assetId: payload.assetId,
          name: payload.name,
          kind: payload.kind,
          sourceUrl: payload.sourceUrl,
          thumbnailUrl: payload.thumbnailUrl,
          startMs,
          durationMs,
          sourceStartMs: 0,
          sourceDurationMs: durationMs,
          muted: false,
          volume: 1,
          metadata: payload.metadata,
        },
      });
    },
    [
      defaultImageDurationMs,
      dispatch,
      pixelsPerSecond,
      project.selection.trackIds,
      project.tracks,
      timelineOffsetPx,
      trackId,
    ],
  );

  const {
    isDragActive,
    dropTargetProps,
  } = useMediaDropTarget({
    disabled,
    onDrop: handleDrop,
  });

  const composedClassName = [
    "timeline-media-drop-target",
    isDragActive &&
      "timeline-media-drop-target--active",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...dropTargetProps}
      className={composedClassName}
    >
      {children}
    </div>
  );
}

export default TimelineMediaDropTarget;