/**
 * Canonical timeline domain model for the video editor.
 *
 * Placement:
 * frontend/src/features/editor/types/timeline.ts
 */

export type TimelineTrackKind = "video" | "audio" | "image" | "text";

export type TimelineClipKind = TimelineTrackKind;

export type TimelineTransitionKind =
  | "none"
  | "crossfade"
  | "fade"
  | "dip-to-black";

export interface TimelineTransition {
  id: string;
  kind: TimelineTransitionKind;
  durationMs: number;
}

export interface TimelineClipTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
  opacity: number;
}

export interface TimelineClipAudio {
  volume: number;
  muted: boolean;
  fadeInMs: number;
  fadeOutMs: number;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  assetId: string;
  kind: TimelineClipKind;
  name: string;

  /**
   * Position on the project timeline.
   */
  startMs: number;

  /**
   * Visible duration on the project timeline.
   */
  durationMs: number;

  /**
   * Trim position inside the source asset.
   */
  sourceStartMs: number;

  /**
   * Optional source duration. Undefined for generated text or still images.
   */
  sourceDurationMs?: number;

  playbackRate: number;
  locked: boolean;
  hidden: boolean;

  transform?: TimelineClipTransform;
  audio?: TimelineClipAudio;

  transitionIn?: TimelineTransition;
  transitionOut?: TimelineTransition;

  metadata?: Readonly<Record<string, unknown>>;
}

export interface TimelineTrack {
  id: string;
  kind: TimelineTrackKind;
  name: string;
  order: number;
  locked: boolean;
  hidden: boolean;
  muted: boolean;
  clips: TimelineClip[];
}

export interface TimelineSelection {
  clipIds: string[];
  trackIds: string[];
}

export interface TimelineViewport {
  scrollLeftPx: number;
  pixelsPerSecond: number;
}

export interface TimelineProject {
  id: string;
  name: string;
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  tracks: TimelineTrack[];
  playheadMs: number;
  selection: TimelineSelection;
  viewport: TimelineViewport;
  createdAt: string;
  updatedAt: string;
}

export const MIN_CLIP_DURATION_MS = 100;
export const DEFAULT_PIXELS_PER_SECOND = 100;
export const MIN_PIXELS_PER_SECOND = 10;
export const MAX_PIXELS_PER_SECOND = 2_000;

export function getClipEndMs(clip: TimelineClip): number {
  return clip.startMs + clip.durationMs;
}

export function clampTimelineTime(
  valueMs: number,
  durationMs: number,
): number {
  if (!Number.isFinite(valueMs)) {
    return 0;
  }

  return Math.min(Math.max(0, valueMs), Math.max(0, durationMs));
}

export function sortTracks(tracks: readonly TimelineTrack[]): TimelineTrack[] {
  return [...tracks]
    .sort((left, right) => left.order - right.order)
    .map((track) => ({
      ...track,
      clips: [...track.clips].sort((left, right) => {
        const startDifference = left.startMs - right.startMs;
        return startDifference !== 0
          ? startDifference
          : left.id.localeCompare(right.id);
      }),
    }));
}

export function calculateTimelineDurationMs(
  tracks: readonly TimelineTrack[],
): number {
  return tracks.reduce((projectEndMs, track) => {
    const trackEndMs = track.clips.reduce(
      (clipEndMs, clip) => Math.max(clipEndMs, getClipEndMs(clip)),
      0,
    );

    return Math.max(projectEndMs, trackEndMs);
  }, 0);
}

export function validateTimelineClip(clip: TimelineClip): string[] {
  const errors: string[] = [];

  if (!clip.id.trim()) {
    errors.push("Clip id is required.");
  }

  if (!clip.trackId.trim()) {
    errors.push("Track id is required.");
  }

  if (!clip.assetId.trim()) {
    errors.push("Asset id is required.");
  }

  if (!Number.isFinite(clip.startMs) || clip.startMs < 0) {
    errors.push("Clip startMs must be a non-negative finite number.");
  }

  if (
    !Number.isFinite(clip.durationMs) ||
    clip.durationMs < MIN_CLIP_DURATION_MS
  ) {
    errors.push(
      `Clip durationMs must be at least ${MIN_CLIP_DURATION_MS} milliseconds.`,
    );
  }

  if (!Number.isFinite(clip.sourceStartMs) || clip.sourceStartMs < 0) {
    errors.push("Clip sourceStartMs must be a non-negative finite number.");
  }

  if (!Number.isFinite(clip.playbackRate) || clip.playbackRate <= 0) {
    errors.push("Clip playbackRate must be a positive finite number.");
  }

  if (
    clip.sourceDurationMs !== undefined &&
    clip.sourceStartMs + clip.durationMs * clip.playbackRate >
      clip.sourceDurationMs
  ) {
    errors.push("Clip trim exceeds the source asset duration.");
  }

  return errors;
}