/**
 * React drag-source helpers for media assets.
 *
 * Placement:
 * frontend/src/features/editor/hooks/useMediaDragSource.ts
 */

import {
  type DragEvent,
  type DragEventHandler,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  type MediaDragPayload,
  writeMediaDragPayload,
} from "../lib/mediaDragPayload";

export interface UseMediaDragSourceOptions {
  disabled?: boolean;
  dragImage?: HTMLElement | null;
  dragImageOffsetX?: number;
  dragImageOffsetY?: number;
  onDragStart?: (
    payload: MediaDragPayload,
    event: DragEvent<HTMLElement>,
  ) => void;
  onDragEnd?: (
    payload: MediaDragPayload,
    event: DragEvent<HTMLElement>,
  ) => void;
}

export interface MediaDragSourceBindings {
  draggable: boolean;
  "aria-disabled": boolean;
  onDragStart: DragEventHandler<HTMLElement>;
  onDragEnd: DragEventHandler<HTMLElement>;
}

export interface UseMediaDragSourceResult {
  isDragging: boolean;
  dragSourceProps: MediaDragSourceBindings;
}

export function useMediaDragSource(
  payload: MediaDragPayload,
  {
    disabled = false,
    dragImage = null,
    dragImageOffsetX = 0,
    dragImageOffsetY = 0,
    onDragStart,
    onDragEnd,
  }: UseMediaDragSourceOptions = {},
): UseMediaDragSourceResult {
  const [isDragging, setIsDragging] =
    useState(false);

  const handleDragStart =
    useCallback<DragEventHandler<HTMLElement>>(
      (event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        writeMediaDragPayload(
          event.dataTransfer,
          payload,
        );

        if (dragImage) {
          event.dataTransfer.setDragImage(
            dragImage,
            dragImageOffsetX,
            dragImageOffsetY,
          );
        }

        setIsDragging(true);
        onDragStart?.(payload, event);
      },
      [
        disabled,
        dragImage,
        dragImageOffsetX,
        dragImageOffsetY,
        onDragStart,
        payload,
      ],
    );

  const handleDragEnd =
    useCallback<DragEventHandler<HTMLElement>>(
      (event) => {
        setIsDragging(false);
        onDragEnd?.(payload, event);
      },
      [onDragEnd, payload],
    );

  const dragSourceProps =
    useMemo<MediaDragSourceBindings>(
      () => ({
        draggable: !disabled,
        "aria-disabled": disabled,
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
      }),
      [
        disabled,
        handleDragEnd,
        handleDragStart,
      ],
    );

  return {
    isDragging,
    dragSourceProps,
  };
}

export default useMediaDragSource;