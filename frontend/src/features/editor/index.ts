/**
 * Public API for the editor feature.
 *
 * Placement:
 * frontend/src/features/editor/index.ts
 */

export {
  VideoEditor,
  type VideoEditorProps,
} from "./components/VideoEditor";

export {
  Timeline,
  type TimelineProps,
} from "./components/Timeline";

export {
  TimelineControls,
  type TimelineControlsProps,
} from "./components/TimelineControls";

export {
  MediaPanel,
  type MediaAsset,
  type MediaAssetKind,
  type MediaPanelProps,
} from "./components/MediaPanel";

export {
  InspectorPanel,
} from "./components/InspectorPanel";

export {
  VideoPreview,
} from "./components/VideoPreview";

export {
  EditorPage,
} from "./pages/EditorPage";

export {
  TimelineProvider,
  createEmptyTimelineProject,
  useTimeline,
  type TimelineProviderProps,
} from "./state/TimelineProvider";

export {
  TimelinePersistence,
  clearTimelineProject,
  loadTimelineProject,
  parseTimelineSnapshot,
  type TimelinePersistenceProps,
} from "./state/TimelinePersistence";

export {
  timelineReducer,
  type TimelineAction,
} from "./state/timelineReducer";

export {
  addClip,
  addTrack,
  deleteClips,
  deleteTracks,
  findClip,
  findTrack,
  getProjectDuration,
  moveClip,
  normalizeTrackOrder,
  removeClip,
  removeTrack,
  splitClip,
  trimClipEnd,
  trimClipStart,
  updateClip,
  updateTrack,
} from "./lib/timelineOperations";

export type {
  TimelineClip,
  TimelineClipKind,
  TimelineProject,
  TimelineSelection,
  TimelineTrack,
  TimelineTrackKind,
  TimelineViewport,
} from "./types/timeline";