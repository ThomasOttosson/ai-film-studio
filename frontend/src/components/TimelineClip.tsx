import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { TimelineTrackClip } from "./TimelineTrack";

export type TimelineClipDragMode = "move" | "trim-start" | "trim-end";

export interface TimelineClipChange {
  clipId: TimelineTrackClip["id"];
  start: number;
  duration: number;
  mode: TimelineClipDragMode;
}

interface TimelineClipProps {
  clip: TimelineTrackClip;
  pixelsPerSecond: number;
  trackHeight?: number;
  accent?: string;
  selected?: boolean;
  disabled?: boolean;
  muted?: boolean;
  minimumDuration?: number;
  snapInterval?: number;
  timelineDuration?: number;
  onSelect?: (clip: TimelineTrackClip) => void;
  onChange?: (change: TimelineClipChange) => void;
  onChangeEnd?: (change: TimelineClipChange) => void;
  onContextMenu?: (
    event: MouseEvent<HTMLElement>,
    clip: TimelineTrackClip,
  ) => void;
  onDoubleClick?: (clip: TimelineTrackClip) => void;
}

interface DragState {
  mode: TimelineClipDragMode;
  pointerId: number;
  startClientX: number;
  originalStart: number;
  originalDuration: number;
}

const DEFAULT_ACCENT = "#2563eb";
const DEFAULT_MINIMUM_DURATION = 0.25;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function snap(value: number, interval: number): number {
  if (interval <= 0) return value;
  return Math.round(value / interval) * interval;
}

function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds * 100) / 100);

  if (Number.isInteger(safeSeconds)) {
    return `${safeSeconds}s`;
  }

  return `${safeSeconds.toFixed(safeSeconds < 10 ? 2 : 1)}s`;
}

function isActivationKey(event: KeyboardEvent<HTMLElement>): boolean {
  return event.key === "Enter" || event.key === " ";
}

function TimelineClip({
  clip,
  pixelsPerSecond,
  trackHeight = 92,
  accent = DEFAULT_ACCENT,
  selected = false,
  disabled = false,
  muted = false,
  minimumDuration = DEFAULT_MINIMUM_DURATION,
  snapInterval = 0,
  timelineDuration = Number.POSITIVE_INFINITY,
  onSelect,
  onChange,
  onChangeEnd,
  onContextMenu,
  onDoubleClick,
}: TimelineClipProps) {
  const safePixelsPerSecond = Math.max(1, pixelsPerSecond);
  const safeMinimumDuration = Math.max(0.01, minimumDuration);
  const safeTimelineDuration = Math.max(0, timelineDuration);
  const clipAccent = clip.color || accent;
  const [previewStart, setPreviewStart] = useState(clip.start);
  const [previewDuration, setPreviewDuration] = useState(clip.duration);
  const dragStateRef = useRef<DragState | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!dragStateRef.current) {
      setPreviewStart(clip.start);
      setPreviewDuration(clip.duration);
    }
  }, [clip.duration, clip.start]);

  const left = Math.max(0, previewStart * safePixelsPerSecond) + 2;
  const width = Math.max(54, previewDuration * safePixelsPerSecond - 4);
  const height = Math.max(44, trackHeight - 16);

  const clipStyle: CSSProperties = {
    left,
    top: 8,
    width,
    height,
    cursor: disabled ? "not-allowed" : "grab",
    zIndex: selected ? 6 : 3,
    opacity: muted || clip.muted ? 0.58 : 1,
    color: "#fff",
    borderColor: selected ? "#fff" : `${clipAccent}aa`,
    background: selected
      ? `linear-gradient(135deg, ${clipAccent}, ${clipAccent}bb)`
      : `linear-gradient(135deg, ${clipAccent}cc, ${clipAccent}77)`,
    boxShadow: selected
      ? `0 0 0 2px ${clipAccent}66, 0 10px 24px rgba(0,0,0,.28)`
      : "0 6px 16px rgba(0,0,0,.18)",
    transition:
      "border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
    touchAction: "none",
  };

  function calculateChange(clientX: number): TimelineClipChange | null {
    const dragState = dragStateRef.current;
    if (!dragState) return null;

    const deltaSeconds =
      (clientX - dragState.startClientX) / safePixelsPerSecond;

    let nextStart = dragState.originalStart;
    let nextDuration = dragState.originalDuration;

    if (dragState.mode === "move") {
      const maximumStart = Number.isFinite(safeTimelineDuration)
        ? Math.max(0, safeTimelineDuration - dragState.originalDuration)
        : Number.POSITIVE_INFINITY;

      nextStart = clamp(
        snap(dragState.originalStart + deltaSeconds, snapInterval),
        0,
        maximumStart,
      );
    }

    if (dragState.mode === "trim-start") {
      const maximumStart =
        dragState.originalStart +
        dragState.originalDuration -
        safeMinimumDuration;
      nextStart = clamp(
        snap(dragState.originalStart + deltaSeconds, snapInterval),
        0,
        maximumStart,
      );
      nextDuration =
        dragState.originalDuration + (dragState.originalStart - nextStart);
    }

    if (dragState.mode === "trim-end") {
      const maximumDuration = Number.isFinite(safeTimelineDuration)
        ? Math.max(
            safeMinimumDuration,
            safeTimelineDuration - dragState.originalStart,
          )
        : Number.POSITIVE_INFINITY;

      nextDuration = clamp(
        snap(dragState.originalDuration + deltaSeconds, snapInterval),
        safeMinimumDuration,
        maximumDuration,
      );
    }

    return {
      clipId: clip.id,
      start: Math.max(0, nextStart),
      duration: Math.max(safeMinimumDuration, nextDuration),
      mode: dragState.mode,
    };
  }

  function beginDrag(
    event: ReactPointerEvent<HTMLElement>,
    mode: TimelineClipDragMode,
  ) {
    if (disabled || event.button !== 0) return;

    event.stopPropagation();
    event.preventDefault();

    onSelect?.(clip);
    dragStateRef.current = {
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      originalStart: previewStart,
      originalDuration: previewDuration,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const change = calculateChange(event.clientX);
    if (!change) return;

    setPreviewStart(change.start);
    setPreviewDuration(change.duration);
    onChange?.(change);
  }

  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const change = calculateChange(event.clientX);
    dragStateRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (change) {
      setPreviewStart(change.start);
      setPreviewDuration(change.duration);
      onChangeEnd?.(change);
    }
  }

  function cancelDrag(event: ReactPointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    setPreviewStart(clip.start);
    setPreviewDuration(clip.duration);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
    if (!disabled) onSelect?.(clip);
  }

  function handleKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (disabled || !isActivationKey(event)) return;
    event.preventDefault();
    onSelect?.(clip);
  }

  return (
    <article
      ref={articleRef}
      className="position-absolute rounded border overflow-hidden user-select-none"
      style={clipStyle}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-pressed={selected}
      aria-disabled={disabled}
      aria-label={`${clip.title}, starts at ${formatSeconds(
        previewStart,
      )}, duration ${formatSeconds(previewDuration)}`}
      title={`${clip.title} · ${formatSeconds(previewDuration)}`}
      onClick={handleClick}
      onKeyDown={handleKeyboard}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (!disabled) onDoubleClick?.(clip);
      }}
      onContextMenu={(event) => {
        event.stopPropagation();
        if (!disabled) onContextMenu?.(event, clip);
      }}
      onPointerDown={(event) => beginDrag(event, "move")}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={cancelDrag}
    >
      {!disabled && (
        <>
          <button
            type="button"
            className="position-absolute top-0 bottom-0 start-0 border-0 p-0"
            style={{
              width: 9,
              cursor: "ew-resize",
              background: selected
                ? "rgba(255,255,255,.72)"
                : "rgba(255,255,255,.25)",
              zIndex: 5,
            }}
            aria-label={`Trim start of ${clip.title}`}
            title="Trim start"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => beginDrag(event, "trim-start")}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={cancelDrag}
          />

          <button
            type="button"
            className="position-absolute top-0 bottom-0 end-0 border-0 p-0"
            style={{
              width: 9,
              cursor: "ew-resize",
              background: selected
                ? "rgba(255,255,255,.72)"
                : "rgba(255,255,255,.25)",
              zIndex: 5,
            }}
            aria-label={`Trim end of ${clip.title}`}
            title="Trim end"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => beginDrag(event, "trim-end")}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={cancelDrag}
          />
        </>
      )}

      <div className="h-100 d-flex flex-column justify-content-between p-2 px-3">
        <div className="d-flex align-items-center gap-2 min-w-0">
          <span
            className="rounded-circle flex-shrink-0"
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              background: "rgba(255,255,255,.92)",
              boxShadow: "0 0 0 3px rgba(255,255,255,.14)",
            }}
          />
          <strong className="small text-truncate">{clip.title}</strong>
        </div>

        <div className="d-flex justify-content-between align-items-end gap-2">
          <span
            className="text-truncate"
            style={{ fontSize: 11, opacity: 0.82 }}
          >
            {clip.subtitle || formatSeconds(previewStart)}
          </span>
          <span
            className="text-nowrap rounded px-1"
            style={{
              fontSize: 10,
              background: "rgba(0,0,0,.26)",
            }}
          >
            {formatSeconds(previewDuration)}
          </span>
        </div>
      </div>

      {disabled && (
        <span
          className="position-absolute top-0 end-0 m-2 rounded px-1"
          style={{
            fontSize: 10,
            background: "rgba(0,0,0,.45)",
          }}
          aria-hidden="true"
        >
          LOCKED
        </span>
      )}
    </article>
  );
}

export default TimelineClip;