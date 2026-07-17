/**
 * React drop-target helper for accepting media assets in the editor timeline.
 *
 * Placement:
 * frontend/src/features/editor/hooks/useMediaDropTarget.ts
 */

import {
  type DragEvent,
  type DragEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  containsMediaDragPayload,
  type MediaDragPayload,
  readMediaDragPayload,
} from "../lib/mediaDragPayload";

export interface MediaDropPosition {
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
}

export interface UseMediaDropTargetOptions {
  disabled?: boolean;
  onDrop: (
    payload: MediaDragPayload,
    position: MediaDropPosition,
    event: DragEvent<HTMLElement>,
  ) => void;
  onDragEnter?: (
    event: DragEvent<HTMLElement>,
  ) => void;
  onDragLeave?: (
    event: DragEvent<HTMLElement>,
  ) => void;
  onDragOver?: (
    event: DragEvent<HTMLElement>,
  ) => void;
}

export interface MediaDropTargetBindings {
  onDragEnter: DragEventHandler<HTMLElement>;
  onDragLeave: DragEventHandler<HTMLElement>;
  onDragOver: DragEventHandler<HTMLElement>;
  onDrop: DragEventHandler<HTMLElement>;
  "data-media-drop-active": boolean;
  "aria-disabled": boolean;
}

export interface UseMediaDropTargetResult {
  isDragActive: boolean;
  dropTargetProps: MediaDropTargetBindings;
}

function getDropPosition(
  event: DragEvent<HTMLElement>,
): MediaDropPosition {
  const bounds =
    event.currentTarget.getBoundingClientRect();

  return {
    clientX: event.clientX,
    clientY: event.clientY,
    offsetX: Math.max(
      0,
      event.clientX - bounds.left,
    ),
    offsetY: Math.max(
      0,
      event.clientY - bounds.top,
    ),
  };
}

export function useMediaDropTarget({
  disabled = false,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragOver,
}: UseMediaDropTargetOptions): UseMediaDropTargetResult {
  const [isDragActive, setIsDragActive] =
    useState(false);

  const dragDepthRef = useRef(0);

  const handleDragEnter =
    useCallback<DragEventHandler<HTMLElement>>(
      (event) => {
        if (
          disabled ||
          !containsMediaDragPayload(
            event.dataTransfer,
          )
        ) {
          return;
        }

        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDragActive(true);
        onDragEnter?.(event);
      },
      [disabled, onDragEnter],
    );

  const handleDragLeave =
    useCallback<DragEventHandler<HTMLElement>>(
      (event) => {
        if (disabled) {
          return;
        }

        dragDepthRef.current = Math.max(
          0,
          dragDepthRef.current - 1,
        );

        if (dragDepthRef.current === 0) {
          setIsDragActive(false);
        }

        onDragLeave?.(event);
      },
      [disabled, onDragLeave],
    );

  const handleDragOver =
    useCallback<DragEventHandler<HTMLElement>>(
      (event) => {
        if (
          disabled ||
          !containsMediaDragPayload(
            event.dataTransfer,
          )
        ) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        onDragOver?.(event);
      },
      [disabled, onDragOver],
    );

  const handleDrop =
    useCallback<DragEventHandler<HTMLElement>>(
      (event) => {
        dragDepthRef.current = 0;
        setIsDragActive(false);

        if (disabled) {
          return;
        }

        const payload = readMediaDragPayload(
          event.dataTransfer,
        );

        if (!payload) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        onDrop(
          payload,
          getDropPosition(event),
          event,
        );
      },
      [disabled, onDrop],
    );

  const dropTargetProps =
    useMemo<MediaDropTargetBindings>(
      () => ({
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
        "data-media-drop-active":
          isDragActive,
        "aria-disabled": disabled,
      }),
      [
        disabled,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        isDragActive,
      ],
    );

  return {
    isDragActive,
    dropTargetProps,
  };
}

export default useMediaDropTarget;