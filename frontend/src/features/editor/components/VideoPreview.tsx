/**
 * Timeline-aware video preview surface.
 *
 * Placement:
 * frontend/src/features/editor/components/VideoPreview.tsx
 */

import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import { useTimeline } from "../state/TimelineProvider";
import type {
  TimelineClip,
  TimelineTrack,
} from "../types/timeline";

interface ActiveClip {
  clip: TimelineClip;
  track: TimelineTrack;
  localTimeMs: number;
}

function findActiveClip(
  tracks: TimelineTrack[],
  playheadMs: number,
  kind: "video" | "audio",
): ActiveClip | null {
  const candidates: ActiveClip[] = [];

  for (const track of tracks) {
    if (
      track.hidden ||
      track.kind !== kind
    ) {
      continue;
    }

    for (const clip of track.clips) {
      const clipEndMs = clip.startMs + clip.durationMs;

      if (
        playheadMs >= clip.startMs &&
        playheadMs < clipEndMs
      ) {
        candidates.push({
          clip,
          track,
          localTimeMs:
            clip.sourceStartMs +
            (playheadMs - clip.startMs) *
              clip.playbackRate,
        });
      }
    }
  }

  candidates.sort(
    (left, right) =>
      right.track.order - left.track.order,
  );

  return candidates[0] ?? null;
}

function syncMediaElement(
  element: HTMLMediaElement,
  activeClip: ActiveClip | null,
): void {
  if (!activeClip) {
    element.pause();
    element.removeAttribute("src");
    element.load();
    return;
  }

  if (element.src !== activeClip.clip.sourceUrl) {
    element.src = activeClip.clip.sourceUrl;
  }

  const targetTimeSeconds =
    activeClip.localTimeMs / 1_000;

  if (
    Number.isFinite(element.duration) &&
    Math.abs(
      element.currentTime - targetTimeSeconds,
    ) > 0.04
  ) {
    element.currentTime = Math.min(
      Math.max(0, targetTimeSeconds),
      element.duration || targetTimeSeconds,
    );
  }

  element.playbackRate =
    activeClip.clip.playbackRate;
  element.volume = Math.min(
    1,
    Math.max(0, activeClip.clip.volume),
  );
}

export function VideoPreview() {
  const { project } = useTimeline();
  const videoRef = useRef<HTMLVideoElement | null>(
    null,
  );
  const audioRef = useRef<HTMLAudioElement | null>(
    null,
  );

  const activeVideoClip = useMemo(
    () =>
      findActiveClip(
        project.tracks,
        project.playheadMs,
        "video",
      ),
    [project.playheadMs, project.tracks],
  );

  const activeAudioClip = useMemo(
    () =>
      findActiveClip(
        project.tracks,
        project.playheadMs,
        "audio",
      ),
    [project.playheadMs, project.tracks],
  );

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    syncMediaElement(video, activeVideoClip);
  }, [activeVideoClip, project.playheadMs]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    syncMediaElement(audio, activeAudioClip);
  }, [activeAudioClip, project.playheadMs]);

  const activeVisualClip = activeVideoClip?.clip;

  return (
    <section
      aria-label="Video preview"
      className="flex h-full min-h-0 items-center justify-center overflow-hidden bg-black p-4"
    >
      <div
        className="relative aspect-video max-h-full w-full max-w-5xl overflow-hidden bg-neutral-950 shadow-2xl"
        style={{
          aspectRatio: `${project.width} / ${project.height}`,
        }}
      >
        {!activeVisualClip ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-400">
                No active visual clip
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                Move the playhead over a video or image clip.
              </p>
            </div>
          </div>
        ) : activeVisualClip.kind === "image" ? (
          <img
            alt={activeVisualClip.name}
            className="h-full w-full object-contain"
            src={activeVisualClip.sourceUrl}
            style={{
              opacity: activeVisualClip.opacity,
            }}
          />
        ) : (
          <video
            aria-label={activeVisualClip.name}
            className="h-full w-full object-contain"
            muted={
              activeVideoClip?.track.muted ?? true
            }
            playsInline
            ref={videoRef}
            style={{
              opacity: activeVisualClip.opacity,
            }}
          />
        )}

        <audio
          aria-hidden="true"
          muted={
            activeAudioClip?.track.muted ?? true
          }
          ref={audioRef}
        />

        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] text-neutral-300">
          {project.width} × {project.height}
        </div>
      </div>
    </section>
  );
}