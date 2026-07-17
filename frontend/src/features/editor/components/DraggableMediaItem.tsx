/**
 * Reusable draggable media item for the editor media library.
 *
 * Placement:
 * frontend/src/features/editor/components/DraggableMediaItem.tsx
 */

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
} from "react";

import {
  type MediaDragPayload,
} from "../lib/mediaDragPayload";
import { useMediaDragSource } from "../hooks/useMediaDragSource";

export interface DraggableMediaItemProps {
  payload: MediaDragPayload;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  selected?: boolean;
  children?: ReactNode;
  onSelect?: (
    payload: MediaDragPayload,
  ) => void;
  onOpen?: (
    payload: MediaDragPayload,
  ) => void;
}

function getMediaKindLabel(
  kind: MediaDragPayload["kind"],
): string {
  switch (kind) {
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "image":
      return "Bild";
  }
}

export function DraggableMediaItem({
  payload,
  className,
  style,
  disabled = false,
  selected = false,
  children,
  onSelect,
  onOpen,
}: DraggableMediaItemProps) {
  const {
    isDragging,
    dragSourceProps,
  } = useMediaDragSource(payload, {
    disabled,
  });

  const handleClick = useCallback(() => {
    if (!disabled) {
      onSelect?.(payload);
    }
  }, [disabled, onSelect, payload]);

  const handleDoubleClick =
    useCallback(() => {
      if (!disabled) {
        onOpen?.(payload);
      }
    }, [disabled, onOpen, payload]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        onSelect?.(payload);
      }

      if (
        event.key === "Enter" &&
        event.shiftKey
      ) {
        event.preventDefault();
        onOpen?.(payload);
      }
    },
    [disabled, onOpen, onSelect, payload],
  );

  const composedClassName = [
    "editor-media-item",
    selected && "editor-media-item--selected",
    isDragging && "editor-media-item--dragging",
    disabled && "editor-media-item--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...dragSourceProps}
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={composedClassName}
      style={style}
      aria-pressed={selected}
      aria-label={`${getMediaKindLabel(
        payload.kind,
      )}: ${payload.name}`}
      data-media-kind={payload.kind}
      data-media-asset-id={payload.assetId}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      {children ?? (
        <>
          <div className="editor-media-item__preview">
            {payload.thumbnailUrl ? (
              <img
                src={payload.thumbnailUrl}
                alt=""
                draggable={false}
                loading="lazy"
              />
            ) : (
              <span aria-hidden="true">
                {getMediaKindLabel(payload.kind)}
              </span>
            )}
          </div>

          <div className="editor-media-item__details">
            <strong className="editor-media-item__name">
              {payload.name}
            </strong>

            <span className="editor-media-item__kind">
              {getMediaKindLabel(payload.kind)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default DraggableMediaItem;