import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { Scene } from "../types/film";

export type TimelineTrackKind =
  | "video"
  | "audio"
  | "text"
  | "music"
  | "effects";

export interface TimelineTrackClip {
  id: number | string;
  scene?: Scene;
  title: string;
  subtitle?: string;
  start: number;
  duration: number;
  color?: string;
  muted?: boolean;
  locked?: boolean;
}

interface TimelineTrackProps {
  id: string;
  name: string;
  kind?: TimelineTrackKind;
  clips: TimelineTrackClip[];
  pixelsPerSecond: number;
  timelineDuration: number;
  selectedClipId?: number | string | null;
  height?: number;
  muted?: boolean;
  locked?: boolean;
  hidden?: boolean;
  headerWidth?: number;
  emptyLabel?: string;
  children?: ReactNode;
  onSelectClip?: (clip: TimelineTrackClip) => void;
  onSeek?: (seconds: number) => void;
  onToggleMute?: (trackId: string) => void;
  onToggleLock?: (trackId: string) => void;
  onToggleVisibility?: (trackId: string) => void;
  onClipContextMenu?: (
    event: MouseEvent<HTMLElement>,
    clip: TimelineTrackClip,
  ) => void;
}

const TRACK_ICONS: Record<TimelineTrackKind, string> = {
  video: "▣",
  audio: "♪",
  text: "T",
  music: "♫",
  effects: "✦",
};

const TRACK_ACCENTS: Record<TimelineTrackKind, string> = {
  video: "#2563eb",
  audio: "#059669",
  text: "#7c3aed",
  music: "#d97706",
  effects: "#db2777",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds * 10) / 10);
  return Number.isInteger(safeSeconds)
    ? `${safeSeconds}s`
    : `${safeSeconds.toFixed(1)}s`;
}

function TimelineTrack({
  id,
  name,
  kind = "video",
  clips,
  pixelsPerSecond,
  timelineDuration,
  selectedClipId = null,
  height = 92,
  muted = false,
  locked = false,
  hidden = false,
  headerWidth = 190,
  emptyLabel = "Drop media here",
  children,
  onSelectClip,
  onSeek,
  onToggleMute,
  onToggleLock,
  onToggleVisibility,
  onClipContextMenu,
}: TimelineTrackProps) {
  const safePixelsPerSecond = Math.max(1, pixelsPerSecond);
  const safeDuration = Math.max(0, timelineDuration);
  const trackWidth = Math.max(640, safeDuration * safePixelsPerSecond);
  const accent = TRACK_ACCENTS[kind];

  function handleTrackClick(event: MouseEvent<HTMLDivElement>) {
    if (!onSeek) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - bounds.left;
    const seconds = clamp(clickX / safePixelsPerSecond, 0, safeDuration);
    onSeek(seconds);
  }

  return (
    <div
      className="d-flex border-bottom border-secondary"
      data-track-id={id}
      style={{ minHeight: height }}
    >
      <aside
        className="flex-shrink-0 border-end border-secondary d-flex align-items-center gap-2 px-3"
        style={{
          width: headerWidth,
          background: "rgba(0, 0, 0, 0.22)",
        }}
      >
        <span
          className="d-inline-flex align-items-center justify-content-center rounded fw-bold"
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            background: `${accent}22`,
            border: `1px solid ${accent}66`,
            color: accent,
          }}
        >
          {TRACK_ICONS[kind]}
        </span>

        <div className="min-w-0 flex-grow-1">
          <div className="text-truncate fw-semibold small">{name}</div>
          <div
            className="text-uppercase muted-text"
            style={{ fontSize: 10, letterSpacing: "0.08em" }}
          >
            {kind}
          </div>
        </div>

        <div className="d-flex align-items-center gap-1">
          {onToggleVisibility && (
            <button
              type="button"
              className={`btn btn-sm px-2 ${
                hidden ? "btn-outline-secondary" : "btn-outline-light"
              }`}
              onClick={() => onToggleVisibility(id)}
              title={hidden ? "Show track" : "Hide track"}
              aria-label={hidden ? `Show ${name}` : `Hide ${name}`}
            >
              {hidden ? "○" : "●"}
            </button>
          )}

          {onToggleMute && (kind === "audio" || kind === "music") && (
            <button
              type="button"
              className={`btn btn-sm px-2 ${
                muted ? "btn-outline-warning" : "btn-outline-light"
              }`}
              onClick={() => onToggleMute(id)}
              title={muted ? "Unmute track" : "Mute track"}
              aria-label={muted ? `Unmute ${name}` : `Mute ${name}`}
            >
              {muted ? "M" : "A"}
            </button>
          )}

          {onToggleLock && (
            <button
              type="button"
              className={`btn btn-sm px-2 ${
                locked ? "btn-outline-danger" : "btn-outline-light"
              }`}
              onClick={() => onToggleLock(id)}
              title={locked ? "Unlock track" : "Lock track"}
              aria-label={locked ? `Unlock ${name}` : `Lock ${name}`}
            >
              {locked ? "▣" : "□"}
            </button>
          )}
        </div>
      </aside>

      <div className="overflow-hidden flex-grow-1">
        <div
          className="position-relative h-100"
          style={{
            width: trackWidth,
            minWidth: "100%",
            background: hidden
              ? "rgba(0, 0, 0, 0.26)"
              : "rgba(255, 255, 255, 0.018)",
            cursor: onSeek ? "pointer" : "default",
          }}
          onClick={handleTrackClick}
          role={onSeek ? "presentation" : undefined}
        >
          <div
            className="position-absolute inset-0"
            aria-hidden="true"
            style={{
              inset: 0,
              opacity: 0.34,
              pointerEvents: "none",
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px)",
              backgroundSize: `${safePixelsPerSecond}px 100%`,
            }}
          />

          {clips.length === 0 && (
            <div className="position-absolute inset-0 d-flex align-items-center px-3 muted-text small">
              {emptyLabel}
            </div>
          )}

          {!hidden &&
            clips.map((clip) => {
              const selected = clip.id === selectedClipId;
              const left = Math.max(0, clip.start * safePixelsPerSecond);
              const width = Math.max(54, clip.duration * safePixelsPerSecond - 4);
              const clipAccent = clip.color || accent;
              const disabled = locked || clip.locked;

              const clipStyle: CSSProperties = {
                left: left + 2,
                top: 8,
                width,
                height: Math.max(44, height - 16),
                cursor: disabled ? "not-allowed" : "pointer",
                zIndex: selected ? 4 : 2,
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
              };

              return (
                <article
                  key={clip.id}
                  className="position-absolute rounded border overflow-hidden user-select-none"
                  style={clipStyle}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!disabled) onSelectClip?.(clip);
                  }}
                  onContextMenu={(event) => {
                    event.stopPropagation();
                    if (!disabled) onClipContextMenu?.(event, clip);
                  }}
                  aria-label={`${clip.title}, starts at ${formatSeconds(
                    clip.start,
                  )}, duration ${formatSeconds(clip.duration)}`}
                  title={`${clip.title} · ${formatSeconds(clip.duration)}`}
                >
                  <div className="h-100 d-flex flex-column justify-content-between p-2">
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
                        {clip.subtitle || formatSeconds(clip.start)}
                      </span>
                      <span
                        className="text-nowrap rounded px-1"
                        style={{
                          fontSize: 10,
                          background: "rgba(0,0,0,.26)",
                        }}
                      >
                        {formatSeconds(clip.duration)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}

          {children}
        </div>
      </div>
    </div>
  );
}

export default TimelineTrack;