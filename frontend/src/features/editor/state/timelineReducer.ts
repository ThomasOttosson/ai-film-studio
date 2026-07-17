/**
 * Reducer and action contract for the video editor timeline.
 *
 * Placement:
 * frontend/src/features/editor/state/timelineReducer.ts
 */

import {
  addClip,
  addTrack,
  moveClip,
  removeClip,
  removeTrack,
  splitClip,
  trimClip,
  type MoveClipInput,
  type SplitClipInput,
  type TrimClipInput,
} from "../lib/timelineOperations";
import {
  MAX_PIXELS_PER_SECOND,
  MIN_PIXELS_PER_SECOND,
  clampTimelineTime,
  type TimelineClip,
  type TimelineProject,
  type TimelineSelection,
  type TimelineTrack,
} from "../types/timeline";

export type TimelineAction =
  | { type: "project/replace"; project: TimelineProject }
  | { type: "track/add"; track: TimelineTrack }
  | { type: "track/remove"; trackId: string }
  | { type: "track/toggle-lock"; trackId: string }
  | { type: "track/toggle-hidden"; trackId: string }
  | { type: "track/toggle-muted"; trackId: string }
  | { type: "clip/add"; clip: TimelineClip }
  | { type: "clip/remove"; clipId: string }
  | { type: "clip/move"; input: MoveClipInput }
  | { type: "clip/trim"; input: TrimClipInput }
  | { type: "clip/split"; input: SplitClipInput }
  | { type: "selection/set"; selection: TimelineSelection }
  | { type: "selection/clear" }
  | { type: "playhead/set"; timeMs: number }
  | { type: "viewport/scroll"; scrollLeftPx: number }
  | { type: "viewport/zoom"; pixelsPerSecond: number };

function markUpdated(project: TimelineProject): TimelineProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

function updateTrack(
  project: TimelineProject,
  trackId: string,
  update: (track: TimelineTrack) => TimelineTrack,
): TimelineProject {
  let found = false;

  const tracks = project.tracks.map((track) => {
    if (track.id !== trackId) {
      return track;
    }

    found = true;
    return update(track);
  });

  if (!found) {
    throw new Error(`Timeline track "${trackId}" was not found.`);
  }

  return markUpdated({
    ...project,
    tracks,
  });
}

function normalizeSelection(
  project: TimelineProject,
  selection: TimelineSelection,
): TimelineSelection {
  const validTrackIds = new Set(project.tracks.map((track) => track.id));
  const validClipIds = new Set(
    project.tracks.flatMap((track) => track.clips.map((clip) => clip.id)),
  );

  return {
    trackIds: [...new Set(selection.trackIds)].filter((id) =>
      validTrackIds.has(id),
    ),
    clipIds: [...new Set(selection.clipIds)].filter((id) =>
      validClipIds.has(id),
    ),
  };
}

export function timelineReducer(
  project: TimelineProject,
  action: TimelineAction,
): TimelineProject {
  switch (action.type) {
    case "project/replace":
      return action.project;

    case "track/add":
      return addTrack(project, action.track);

    case "track/remove":
      return removeTrack(project, action.trackId);

    case "track/toggle-lock":
      return updateTrack(project, action.trackId, (track) => ({
        ...track,
        locked: !track.locked,
      }));

    case "track/toggle-hidden":
      return updateTrack(project, action.trackId, (track) => ({
        ...track,
        hidden: !track.hidden,
      }));

    case "track/toggle-muted":
      return updateTrack(project, action.trackId, (track) => ({
        ...track,
        muted: !track.muted,
      }));

    case "clip/add":
      return addClip(project, action.clip);

    case "clip/remove":
      return removeClip(project, action.clipId);

    case "clip/move":
      return moveClip(project, action.input);

    case "clip/trim":
      return trimClip(project, action.input);

    case "clip/split":
      return splitClip(project, action.input);

    case "selection/set":
      return {
        ...project,
        selection: normalizeSelection(project, action.selection),
      };

    case "selection/clear":
      return {
        ...project,
        selection: {
          clipIds: [],
          trackIds: [],
        },
      };

    case "playhead/set":
      return {
        ...project,
        playheadMs: clampTimelineTime(action.timeMs, project.durationMs),
      };

    case "viewport/scroll":
      return {
        ...project,
        viewport: {
          ...project.viewport,
          scrollLeftPx: Math.max(0, action.scrollLeftPx),
        },
      };

    case "viewport/zoom":
      return {
        ...project,
        viewport: {
          ...project.viewport,
          pixelsPerSecond: Math.min(
            MAX_PIXELS_PER_SECOND,
            Math.max(MIN_PIXELS_PER_SECOND, action.pixelsPerSecond),
          ),
        },
      };

    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}