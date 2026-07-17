/**
 * Immutable timeline editing operations for the video editor.
 *
 * Placement:
 * frontend/src/features/editor/lib/timelineOperations.ts
 */

import {
  MIN_CLIP_DURATION_MS,
  calculateTimelineDurationMs,
  clampTimelineTime,
  getClipEndMs,
  sortTracks,
  type TimelineClip,
  type TimelineProject,
  type TimelineTrack,
} from "../types/timeline";

export interface MoveClipInput {
  clipId: string;
  targetTrackId: string;
  startMs: number;
}

export interface TrimClipInput {
  clipId: string;
  edge: "start" | "end";
  timeMs: number;
}

export interface SplitClipInput {
  clipId: string;
  splitTimeMs: number;
  rightClipId: string;
}

function updateProject(
  project: TimelineProject,
  tracks: TimelineTrack[],
): TimelineProject {
  const normalizedTracks = sortTracks(tracks);
  const durationMs = calculateTimelineDurationMs(normalizedTracks);

  return {
    ...project,
    tracks: normalizedTracks,
    durationMs,
    playheadMs: clampTimelineTime(project.playheadMs, durationMs),
    updatedAt: new Date().toISOString(),
  };
}

function findClip(
  project: TimelineProject,
  clipId: string,
): { track: TimelineTrack; clip: TimelineClip } {
  for (const track of project.tracks) {
    const clip = track.clips.find((candidate) => candidate.id === clipId);
    if (clip) {
      return { track, clip };
    }
  }

  throw new Error(`Timeline clip "${clipId}" was not found.`);
}

function replaceClip(
  tracks: readonly TimelineTrack[],
  clipId: string,
  replacement: TimelineClip | null,
): TimelineTrack[] {
  return tracks.map((track) => ({
    ...track,
    clips: track.clips.flatMap((clip) => {
      if (clip.id !== clipId) {
        return [clip];
      }

      return replacement ? [replacement] : [];
    }),
  }));
}

export function addTrack(
  project: TimelineProject,
  track: TimelineTrack,
): TimelineProject {
  if (project.tracks.some((candidate) => candidate.id === track.id)) {
    throw new Error(`Timeline track "${track.id}" already exists.`);
  }

  return updateProject(project, [...project.tracks, track]);
}

export function removeTrack(
  project: TimelineProject,
  trackId: string,
): TimelineProject {
  if (!project.tracks.some((track) => track.id === trackId)) {
    return project;
  }

  const tracks = project.tracks.filter((track) => track.id !== trackId);
  const removedClipIds = new Set(
    project.tracks
      .find((track) => track.id === trackId)
      ?.clips.map((clip) => clip.id) ?? [],
  );

  return {
    ...updateProject(project, tracks),
    selection: {
      trackIds: project.selection.trackIds.filter((id) => id !== trackId),
      clipIds: project.selection.clipIds.filter(
        (id) => !removedClipIds.has(id),
      ),
    },
  };
}

export function addClip(
  project: TimelineProject,
  clip: TimelineClip,
): TimelineProject {
  if (project.tracks.some((track) => track.clips.some(({ id }) => id === clip.id))) {
    throw new Error(`Timeline clip "${clip.id}" already exists.`);
  }

  const targetTrack = project.tracks.find((track) => track.id === clip.trackId);
  if (!targetTrack) {
    throw new Error(`Timeline track "${clip.trackId}" was not found.`);
  }

  if (targetTrack.locked) {
    throw new Error(`Timeline track "${targetTrack.id}" is locked.`);
  }

  if (targetTrack.kind !== clip.kind) {
    throw new Error(
      `Clip kind "${clip.kind}" cannot be placed on "${targetTrack.kind}" track.`,
    );
  }

  const tracks = project.tracks.map((track) =>
    track.id === clip.trackId
      ? { ...track, clips: [...track.clips, clip] }
      : track,
  );

  return updateProject(project, tracks);
}

export function removeClip(
  project: TimelineProject,
  clipId: string,
): TimelineProject {
  const { track } = findClip(project, clipId);
  if (track.locked) {
    throw new Error(`Timeline track "${track.id}" is locked.`);
  }

  return {
    ...updateProject(project, replaceClip(project.tracks, clipId, null)),
    selection: {
      ...project.selection,
      clipIds: project.selection.clipIds.filter((id) => id !== clipId),
    },
  };
}

export function moveClip(
  project: TimelineProject,
  input: MoveClipInput,
): TimelineProject {
  const { track: sourceTrack, clip } = findClip(project, input.clipId);
  const targetTrack = project.tracks.find(
    (track) => track.id === input.targetTrackId,
  );

  if (!targetTrack) {
    throw new Error(`Timeline track "${input.targetTrackId}" was not found.`);
  }

  if (sourceTrack.locked || targetTrack.locked || clip.locked) {
    throw new Error("Locked clips or tracks cannot be moved.");
  }

  if (targetTrack.kind !== clip.kind) {
    throw new Error(
      `Clip kind "${clip.kind}" cannot be placed on "${targetTrack.kind}" track.`,
    );
  }

  const movedClip: TimelineClip = {
    ...clip,
    trackId: targetTrack.id,
    startMs: Math.max(0, input.startMs),
  };

  const tracks = replaceClip(project.tracks, clip.id, null).map((track) =>
    track.id === targetTrack.id
      ? { ...track, clips: [...track.clips, movedClip] }
      : track,
  );

  return updateProject(project, tracks);
}

export function trimClip(
  project: TimelineProject,
  input: TrimClipInput,
): TimelineProject {
  const { track, clip } = findClip(project, input.clipId);

  if (track.locked || clip.locked) {
    throw new Error("Locked clips or tracks cannot be trimmed.");
  }

  let trimmedClip: TimelineClip;

  if (input.edge === "start") {
    const latestStartMs = getClipEndMs(clip) - MIN_CLIP_DURATION_MS;
    const nextStartMs = Math.min(
      Math.max(clip.startMs, input.timeMs),
      latestStartMs,
    );
    const removedTimelineMs = nextStartMs - clip.startMs;

    trimmedClip = {
      ...clip,
      startMs: nextStartMs,
      durationMs: clip.durationMs - removedTimelineMs,
      sourceStartMs:
        clip.sourceStartMs + removedTimelineMs * clip.playbackRate,
    };
  } else {
    const earliestEndMs = clip.startMs + MIN_CLIP_DURATION_MS;
    const requestedEndMs = Math.max(earliestEndMs, input.timeMs);
    const sourceLimitedEndMs =
      clip.sourceDurationMs === undefined
        ? requestedEndMs
        : Math.min(
            requestedEndMs,
            clip.startMs +
              (clip.sourceDurationMs - clip.sourceStartMs) /
                clip.playbackRate,
          );

    trimmedClip = {
      ...clip,
      durationMs: sourceLimitedEndMs - clip.startMs,
    };
  }

  return updateProject(
    project,
    replaceClip(project.tracks, clip.id, trimmedClip),
  );
}

export function splitClip(
  project: TimelineProject,
  input: SplitClipInput,
): TimelineProject {
  const { track, clip } = findClip(project, input.clipId);

  if (track.locked || clip.locked) {
    throw new Error("Locked clips or tracks cannot be split.");
  }

  if (
    project.tracks.some((candidate) =>
      candidate.clips.some(({ id }) => id === input.rightClipId),
    )
  ) {
    throw new Error(`Timeline clip "${input.rightClipId}" already exists.`);
  }

  const minimumSplitMs = clip.startMs + MIN_CLIP_DURATION_MS;
  const maximumSplitMs = getClipEndMs(clip) - MIN_CLIP_DURATION_MS;

  if (
    input.splitTimeMs < minimumSplitMs ||
    input.splitTimeMs > maximumSplitMs
  ) {
    throw new Error("Split position is too close to a clip edge.");
  }

  const leftDurationMs = input.splitTimeMs - clip.startMs;
  const rightDurationMs = clip.durationMs - leftDurationMs;

  const leftClip: TimelineClip = {
    ...clip,
    durationMs: leftDurationMs,
    transitionOut: undefined,
  };

  const rightClip: TimelineClip = {
    ...clip,
    id: input.rightClipId,
    name: `${clip.name} (split)`,
    startMs: input.splitTimeMs,
    durationMs: rightDurationMs,
    sourceStartMs:
      clip.sourceStartMs + leftDurationMs * clip.playbackRate,
    transitionIn: undefined,
  };

  const tracks = project.tracks.map((candidate) =>
    candidate.id === track.id
      ? {
          ...candidate,
          clips: candidate.clips.flatMap((existingClip) =>
            existingClip.id === clip.id
              ? [leftClip, rightClip]
              : [existingClip],
          ),
        }
      : candidate,
  );

  return updateProject(project, tracks);
}