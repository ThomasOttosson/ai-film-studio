/**
 * Inspector panel for editing the currently selected timeline clip.
 *
 * Placement:
 * frontend/src/features/editor/components/InspectorPanel.tsx
 */

import {
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react";

import { useTimeline } from "../state/TimelineProvider";
import type {
  TimelineClip,
  TimelineTrack,
} from "../types/timeline";

interface SelectedClipContext {
  clip: TimelineClip;
  track: TimelineTrack;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseNumber(
  event: ChangeEvent<HTMLInputElement>,
  fallback: number,
): number {
  const value = Number(event.target.value);
  return Number.isFinite(value) ? value : fallback;
}

export function InspectorPanel() {
  const { project, dispatch } = useTimeline();

  const selected = useMemo<SelectedClipContext | null>(() => {
    const selectedClipId = project.selection.clipIds[0];

    if (!selectedClipId) {
      return null;
    }

    for (const track of project.tracks) {
      const clip = track.clips.find(
        (candidate) => candidate.id === selectedClipId,
      );

      if (clip) {
        return {
          clip,
          track,
        };
      }
    }

    return null;
  }, [project.selection.clipIds, project.tracks]);

  const updateClip = useCallback(
    (changes: Partial<TimelineClip>) => {
      if (!selected) {
        return;
      }

      dispatch({
        type: "clip/update",
        clipId: selected.clip.id,
        changes,
      });
    },
    [dispatch, selected],
  );

  if (!selected) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-neutral-950 text-neutral-100">
        <header className="border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold">Inspector</h2>
        </header>

        <div className="grid min-h-0 flex-1 place-items-center p-6 text-center">
          <div>
            <p className="text-xs font-medium text-neutral-300">
              No clip selected
            </p>
            <p className="mt-1 text-[11px] leading-5 text-neutral-500">
              Select a timeline clip to edit its timing and media properties.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const { clip, track } = selected;

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold">Inspector</h2>
        <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-neutral-500">
          {clip.kind} · {track.name}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <section className="space-y-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Clip
          </h3>

          <label className="block space-y-1">
            <span className="text-xs text-neutral-400">Name</span>
            <input
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
              onChange={(event) =>
                updateClip({ name: event.target.value })
              }
              type="text"
              value={clip.name}
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-400">Locked</span>
            <input
              checked={clip.locked}
              onChange={(event) =>
                updateClip({ locked: event.target.checked })
              }
              type="checkbox"
            />
          </label>
        </section>

        <section className="space-y-3 border-t border-neutral-800 pt-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Timing
          </h3>

          <label className="block space-y-1">
            <span className="text-xs text-neutral-400">Start (ms)</span>
            <input
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-2 text-xs tabular-nums focus:border-blue-500 focus:outline-none"
              min={0}
              onChange={(event) =>
                updateClip({
                  startMs: Math.max(
                    0,
                    parseNumber(event, clip.startMs),
                  ),
                })
              }
              type="number"
              value={clip.startMs}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-neutral-400">
              Duration (ms)
            </span>
            <input
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-2 text-xs tabular-nums focus:border-blue-500 focus:outline-none"
              min={1}
              onChange={(event) =>
                updateClip({
                  durationMs: Math.max(
                    1,
                    parseNumber(event, clip.durationMs),
                  ),
                })
              }
              type="number"
              value={clip.durationMs}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-neutral-400">
              Source offset (ms)
            </span>
            <input
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-2 text-xs tabular-nums focus:border-blue-500 focus:outline-none"
              min={0}
              onChange={(event) =>
                updateClip({
                  sourceStartMs: Math.max(
                    0,
                    parseNumber(
                      event,
                      clip.sourceStartMs,
                    ),
                  ),
                })
              }
              type="number"
              value={clip.sourceStartMs}
            />
          </label>

          <label className="block space-y-1">
            <span className="flex justify-between text-xs text-neutral-400">
              <span>Playback rate</span>
              <span className="tabular-nums">
                {clip.playbackRate.toFixed(2)}×
              </span>
            </span>
            <input
              className="w-full"
              max={4}
              min={0.25}
              onChange={(event) =>
                updateClip({
                  playbackRate: clamp(
                    parseNumber(event, clip.playbackRate),
                    0.25,
                    4,
                  ),
                })
              }
              step={0.05}
              type="range"
              value={clip.playbackRate}
            />
          </label>
        </section>

        <section className="space-y-3 border-t border-neutral-800 pt-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Appearance
          </h3>

          <label className="block space-y-1">
            <span className="flex justify-between text-xs text-neutral-400">
              <span>Opacity</span>
              <span className="tabular-nums">
                {Math.round(clip.opacity * 100)}%
              </span>
            </span>
            <input
              className="w-full"
              max={1}
              min={0}
              onChange={(event) =>
                updateClip({
                  opacity: clamp(
                    parseNumber(event, clip.opacity),
                    0,
                    1,
                  ),
                })
              }
              step={0.01}
              type="range"
              value={clip.opacity}
            />
          </label>
        </section>

        {(clip.kind === "audio" || clip.kind === "video") && (
          <section className="space-y-3 border-t border-neutral-800 pt-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Audio
            </h3>

            <label className="block space-y-1">
              <span className="flex justify-between text-xs text-neutral-400">
                <span>Volume</span>
                <span className="tabular-nums">
                  {Math.round(clip.volume * 100)}%
                </span>
              </span>
              <input
                className="w-full"
                max={2}
                min={0}
                onChange={(event) =>
                  updateClip({
                    volume: clamp(
                      parseNumber(event, clip.volume),
                      0,
                      2,
                    ),
                  })
                }
                step={0.01}
                type="range"
                value={clip.volume}
              />
            </label>
          </section>
        )}

        <section className="space-y-3 border-t border-neutral-800 pt-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Source
          </h3>

          <p className="break-all rounded-md bg-neutral-900 p-2 text-[10px] leading-4 text-neutral-500">
            {clip.sourceUrl}
          </p>
        </section>
      </div>
    </aside>
  );
}