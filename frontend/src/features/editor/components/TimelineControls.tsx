/**
 * Playback and editing controls for the video editor timeline.
 *
 * Placement:
 * frontend/src/features/editor/components/TimelineControls.tsx
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useTimeline } from "../state/TimelineProvider";
import { getClipEndMs } from "../types/timeline";

const PLAYBACK_TICK_MS = 16;

function formatTimecode(milliseconds: number, fps: number): string {
  const safeMilliseconds = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(safeMilliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const frames = Math.floor(
    (safeMilliseconds % 1_000) / (1_000 / fps),
  );

  return [hours, minutes, seconds, frames]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

export function TimelineControls() {
  const { project, dispatch, setPlayhead } = useTimeline();
  const [isPlaying, setIsPlaying] = useState(false);
  const lastTickRef = useRef<number | null>(null);

  const selectedClip = useMemo(() => {
    const selectedClipId = project.selection.clipIds[0];

    if (!selectedClipId) {
      return null;
    }

    for (const track of project.tracks) {
      const clip = track.clips.find(
        (candidate) => candidate.id === selectedClipId,
      );

      if (clip) {
        return clip;
      }
    }

    return null;
  }, [project.selection.clipIds, project.tracks]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    lastTickRef.current = null;
  }, []);

  const togglePlayback = useCallback(() => {
    if (project.durationMs <= 0) {
      return;
    }

    if (project.playheadMs >= project.durationMs) {
      setPlayhead(0);
    }

    setIsPlaying((current) => !current);
  }, [
    project.durationMs,
    project.playheadMs,
    setPlayhead,
  ]);

  const seekByFrames = useCallback(
    (frameDelta: number) => {
      stopPlayback();

      const frameDurationMs = 1_000 / project.fps;
      setPlayhead(
        project.playheadMs + frameDelta * frameDurationMs,
      );
    },
    [
      project.fps,
      project.playheadMs,
      setPlayhead,
      stopPlayback,
    ],
  );

  const jumpToStart = useCallback(() => {
    stopPlayback();
    setPlayhead(0);
  }, [setPlayhead, stopPlayback]);

  const jumpToEnd = useCallback(() => {
    stopPlayback();
    setPlayhead(project.durationMs);
  }, [project.durationMs, setPlayhead, stopPlayback]);

  const splitSelectedClip = useCallback(() => {
    if (!selectedClip) {
      return;
    }

    const minimumSplitMs = selectedClip.startMs + 100;
    const maximumSplitMs = getClipEndMs(selectedClip) - 100;

    if (
      project.playheadMs < minimumSplitMs ||
      project.playheadMs > maximumSplitMs
    ) {
      return;
    }

    dispatch({
      type: "clip/split",
      input: {
        clipId: selectedClip.id,
        splitTimeMs: project.playheadMs,
        rightClipId: crypto.randomUUID(),
      },
    });
  }, [dispatch, project.playheadMs, selectedClip]);

  const deleteSelectedClips = useCallback(() => {
    for (const clipId of project.selection.clipIds) {
      dispatch({
        type: "clip/remove",
        clipId,
      });
    }
  }, [dispatch, project.selection.clipIds]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let animationFrameId = 0;

    const tick = (timestamp: number) => {
      const previousTimestamp = lastTickRef.current;
      lastTickRef.current = timestamp;

      if (previousTimestamp !== null) {
        const elapsedMs = Math.min(
          100,
          Math.max(0, timestamp - previousTimestamp),
        );
        const nextPlayheadMs = project.playheadMs + elapsedMs;

        if (nextPlayheadMs >= project.durationMs) {
          setPlayhead(project.durationMs);
          stopPlayback();
          return;
        }

        setPlayhead(nextPlayheadMs);
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    const timeoutId = window.setTimeout(() => {
      animationFrameId = window.requestAnimationFrame(tick);
    }, PLAYBACK_TICK_MS);

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [
    isPlaying,
    project.durationMs,
    project.playheadMs,
    setPlayhead,
    stopPlayback,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekByFrames(event.shiftKey ? -10 : -1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        seekByFrames(event.shiftKey ? 10 : 1);
        return;
      }

      if (
        event.key.toLowerCase() === "s" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        splitSelectedClip();
        return;
      }

      if (
        event.key === "Backspace" ||
        event.key === "Delete"
      ) {
        event.preventDefault();
        deleteSelectedClips();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    deleteSelectedClips,
    seekByFrames,
    splitSelectedClip,
    togglePlayback,
  ]);

  const canSplit =
    selectedClip !== null &&
    project.playheadMs >= selectedClip.startMs + 100 &&
    project.playheadMs <= getClipEndMs(selectedClip) - 100;

  return (
    <div
      aria-label="Timeline controls"
      className="flex h-12 items-center justify-between gap-4 border-b border-neutral-800 bg-neutral-950 px-3 text-neutral-100"
      role="toolbar"
    >
      <div className="flex items-center gap-1">
        <button
          aria-label="Jump to timeline start"
          className="rounded px-2 py-1 text-xs hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          onClick={jumpToStart}
          type="button"
        >
          Start
        </button>

        <button
          aria-label="Previous frame"
          className="rounded px-2 py-1 text-xs hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          onClick={() => seekByFrames(-1)}
          type="button"
        >
          −1f
        </button>

        <button
          aria-label={isPlaying ? "Pause" : "Play"}
          aria-pressed={isPlaying}
          className="min-w-16 rounded bg-neutral-800 px-3 py-1 text-xs font-medium hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={project.durationMs <= 0}
          onClick={togglePlayback}
          type="button"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          aria-label="Next frame"
          className="rounded px-2 py-1 text-xs hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          onClick={() => seekByFrames(1)}
          type="button"
        >
          +1f
        </button>

        <button
          aria-label="Jump to timeline end"
          className="rounded px-2 py-1 text-xs hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          onClick={jumpToEnd}
          type="button"
        >
          End
        </button>
      </div>

      <output
        aria-label="Current timeline timecode"
        className="font-mono text-xs tabular-nums text-neutral-300"
      >
        {formatTimecode(project.playheadMs, project.fps)}
        <span className="px-1 text-neutral-600">/</span>
        {formatTimecode(project.durationMs, project.fps)}
      </output>

      <div className="flex items-center gap-1">
        <button
          aria-label="Split selected clip at playhead"
          className="rounded px-2 py-1 text-xs hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canSplit}
          onClick={splitSelectedClip}
          title="Split selected clip (S)"
          type="button"
        >
          Split
        </button>

        <button
          aria-label="Delete selected clips"
          className="rounded px-2 py-1 text-xs hover:bg-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={project.selection.clipIds.length === 0}
          onClick={deleteSelectedClips}
          title="Delete selected clips"
          type="button"
        >
          Delete
        </button>
      </div>
    </div>
  );
}