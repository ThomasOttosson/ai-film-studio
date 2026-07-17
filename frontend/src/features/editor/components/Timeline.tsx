/**
 * Primary timeline surface for the video editor.
 *
 * Placement:
 * frontend/src/features/editor/components/Timeline.tsx
 */

import {
  useCallback,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type UIEvent,
} from "react";

import { useTimeline } from "../state/TimelineProvider";
import {
  getClipEndMs,
  type TimelineClip,
  type TimelineTrack,
} from "../types/timeline";

const TRACK_HEADER_WIDTH_PX = 220;
const TRACK_HEIGHT_PX = 72;
const RULER_HEIGHT_PX = 32;
const MIN_TIMELINE_WIDTH_PX = 1_200;

function millisecondsToPixels(
  milliseconds: number,
  pixelsPerSecond: number,
): number {
  return (milliseconds / 1_000) * pixelsPerSecond;
}

function pixelsToMilliseconds(
  pixels: number,
  pixelsPerSecond: number,
): number {
  return (pixels / pixelsPerSecond) * 1_000;
}

function formatTimecode(milliseconds: number, fps: number): string {
  const safeMilliseconds = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(safeMilliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const frameDurationMs = 1_000 / fps;
  const frames = Math.floor(
    (safeMilliseconds % 1_000) / frameDurationMs,
  );

  return [hours, minutes, seconds, frames]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

function getTickIntervalMs(pixelsPerSecond: number): number {
  if (pixelsPerSecond >= 800) return 100;
  if (pixelsPerSecond >= 400) return 250;
  if (pixelsPerSecond >= 200) return 500;
  if (pixelsPerSecond >= 100) return 1_000;
  if (pixelsPerSecond >= 50) return 2_000;
  if (pixelsPerSecond >= 25) return 5_000;
  return 10_000;
}

function getClipLabel(clip: TimelineClip): string {
  const durationSeconds = clip.durationMs / 1_000;
  return `${clip.name} · ${durationSeconds.toFixed(1)}s`;
}

interface TimelineRulerProps {
  durationMs: number;
  fps: number;
  pixelsPerSecond: number;
  widthPx: number;
}

function TimelineRuler({
  durationMs,
  fps,
  pixelsPerSecond,
  widthPx,
}: TimelineRulerProps) {
  const tickIntervalMs = getTickIntervalMs(pixelsPerSecond);
  const tickCount = Math.ceil(durationMs / tickIntervalMs) + 1;

  const ticks = useMemo(
    () =>
      Array.from({ length: tickCount }, (_, index) => {
        const timeMs = index * tickIntervalMs;
        return {
          timeMs,
          leftPx: millisecondsToPixels(timeMs, pixelsPerSecond),
        };
      }),
    [pixelsPerSecond, tickCount, tickIntervalMs],
  );

  return (
    <div
      aria-hidden="true"
      className="relative border-b border-neutral-800 bg-neutral-950"
      style={{ height: RULER_HEIGHT_PX, width: widthPx }}
    >
      {ticks.map(({ timeMs, leftPx }) => (
        <div
          className="absolute inset-y-0 border-l border-neutral-700"
          key={timeMs}
          style={{ left: leftPx }}
        >
          <span className="absolute left-1 top-1 select-none text-[10px] tabular-nums text-neutral-400">
            {formatTimecode(timeMs, fps)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface TimelineTrackRowProps {
  track: TimelineTrack;
  pixelsPerSecond: number;
  widthPx: number;
  selectedClipIds: ReadonlySet<string>;
  onSelectClip: (
    event: ReactMouseEvent<HTMLButtonElement>,
    clipId: string,
  ) => void;
}

function TimelineTrackRow({
  track,
  pixelsPerSecond,
  widthPx,
  selectedClipIds,
  onSelectClip,
}: TimelineTrackRowProps) {
  return (
    <div
      className="relative border-b border-neutral-800 bg-neutral-900/70"
      data-track-id={track.id}
      style={{ height: TRACK_HEIGHT_PX, width: widthPx }}
    >
      {track.clips.map((clip) => {
        const leftPx = millisecondsToPixels(
          clip.startMs,
          pixelsPerSecond,
        );
        const clipWidthPx = Math.max(
          2,
          millisecondsToPixels(clip.durationMs, pixelsPerSecond),
        );
        const selected = selectedClipIds.has(clip.id);

        return (
          <button
            aria-label={`${clip.name}, ${formatTimecode(
              clip.startMs,
              30,
            )} till ${formatTimecode(getClipEndMs(clip), 30)}`}
            aria-pressed={selected}
            className={[
              "absolute top-2 h-14 overflow-hidden rounded-md border px-2 text-left",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
              selected
                ? "border-blue-400 bg-blue-500/30"
                : "border-neutral-600 bg-neutral-700/80 hover:bg-neutral-700",
              clip.locked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
            ].join(" ")}
            disabled={track.locked || clip.locked}
            key={clip.id}
            onClick={(event) => onSelectClip(event, clip.id)}
            style={{
              left: leftPx,
              width: clipWidthPx,
            }}
            type="button"
          >
            <span className="block truncate text-xs font-medium text-neutral-100">
              {getClipLabel(clip)}
            </span>
            <span className="mt-1 block truncate text-[10px] uppercase tracking-wide text-neutral-400">
              {clip.kind}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Timeline() {
  const {
    project,
    dispatch,
    setPlayhead,
    setScrollLeft,
  } = useTimeline();

  const viewportRef = useRef<HTMLDivElement | null>(null);

  const timelineWidthPx = Math.max(
    MIN_TIMELINE_WIDTH_PX,
    millisecondsToPixels(
      Math.max(project.durationMs, 10_000),
      project.viewport.pixelsPerSecond,
    ),
  );

  const selectedClipIds = useMemo(
    () => new Set(project.selection.clipIds),
    [project.selection.clipIds],
  );

  const handleViewportScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      setScrollLeft(event.currentTarget.scrollLeft);
    },
    [setScrollLeft],
  );

  const handleTimelinePointer = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const contentX =
        event.clientX -
        bounds.left +
        viewport.scrollLeft;

      setPlayhead(
        pixelsToMilliseconds(
          Math.max(0, contentX),
          project.viewport.pixelsPerSecond,
        ),
      );
    },
    [project.viewport.pixelsPerSecond, setPlayhead],
  );

  const handleSelectClip = useCallback(
    (
      event: ReactMouseEvent<HTMLButtonElement>,
      clipId: string,
    ) => {
      event.stopPropagation();

      const additive = event.metaKey || event.ctrlKey || event.shiftKey;
      const selected = project.selection.clipIds.includes(clipId);

      let clipIds: string[];

      if (additive && selected) {
        clipIds = project.selection.clipIds.filter(
          (id) => id !== clipId,
        );
      } else if (additive) {
        clipIds = [...project.selection.clipIds, clipId];
      } else {
        clipIds = [clipId];
      }

      dispatch({
        type: "selection/set",
        selection: {
          clipIds,
          trackIds: [],
        },
      });
    },
    [dispatch, project.selection.clipIds],
  );

  const playheadLeftPx = millisecondsToPixels(
    project.playheadMs,
    project.viewport.pixelsPerSecond,
  );

  return (
    <section
      aria-label="Video timeline"
      className="flex min-h-0 flex-col overflow-hidden border-t border-neutral-800 bg-neutral-950 text-neutral-100"
    >
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-neutral-800 px-3">
        <div>
          <h2 className="text-sm font-semibold">Timeline</h2>
          <p className="text-[10px] tabular-nums text-neutral-400">
            {formatTimecode(project.playheadMs, project.fps)}
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs text-neutral-400">
          Zoom
          <input
            aria-label="Timeline zoom"
            max={800}
            min={10}
            onChange={(event) =>
              dispatch({
                type: "viewport/zoom",
                pixelsPerSecond: Number(event.target.value),
              })
            }
            step={10}
            type="range"
            value={project.viewport.pixelsPerSecond}
          />
        </label>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="shrink-0 border-r border-neutral-800 bg-neutral-950"
          style={{ width: TRACK_HEADER_WIDTH_PX }}
        >
          <div
            className="border-b border-neutral-800"
            style={{ height: RULER_HEIGHT_PX }}
          />

          {project.tracks.map((track) => (
            <div
              className="flex items-center justify-between gap-2 border-b border-neutral-800 px-3"
              key={track.id}
              style={{ height: TRACK_HEIGHT_PX }}
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">
                  {track.name}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-neutral-500">
                  {track.kind}
                </p>
              </div>

              <div className="flex gap-1 text-[10px] text-neutral-500">
                {track.locked ? <span title="Locked">L</span> : null}
                {track.hidden ? <span title="Hidden">H</span> : null}
                {track.muted ? <span title="Muted">M</span> : null}
              </div>
            </div>
          ))}
        </aside>

        <div
          className="min-w-0 flex-1 overflow-auto"
          onScroll={handleViewportScroll}
          ref={viewportRef}
        >
          <div
            className="relative"
            onMouseDown={handleTimelinePointer}
            role="presentation"
            style={{ width: timelineWidthPx }}
          >
            <TimelineRuler
              durationMs={Math.max(project.durationMs, 10_000)}
              fps={project.fps}
              pixelsPerSecond={project.viewport.pixelsPerSecond}
              widthPx={timelineWidthPx}
            />

            {project.tracks.map((track) => (
              <TimelineTrackRow
                key={track.id}
                onSelectClip={handleSelectClip}
                pixelsPerSecond={project.viewport.pixelsPerSecond}
                selectedClipIds={selectedClipIds}
                track={track}
                widthPx={timelineWidthPx}
              />
            ))}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-red-500"
              style={{ left: playheadLeftPx }}
            >
              <div className="absolute -left-1.5 top-0 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-red-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}