/**
 * React state provider for the video editor timeline.
 *
 * Placement:
 * frontend/src/features/editor/state/TimelineProvider.tsx
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type PropsWithChildren,
} from "react";

import {
  timelineReducer,
  type TimelineAction,
} from "./timelineReducer";
import {
  DEFAULT_PIXELS_PER_SECOND,
  type TimelineProject,
} from "../types/timeline";

export interface TimelineContextValue {
  project: TimelineProject;
  dispatch: Dispatch<TimelineAction>;
  setPlayhead: (timeMs: number) => void;
  setZoom: (pixelsPerSecond: number) => void;
  setScrollLeft: (scrollLeftPx: number) => void;
  clearSelection: () => void;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);

export interface TimelineProviderProps extends PropsWithChildren {
  initialProject: TimelineProject;
}

export function TimelineProvider({
  initialProject,
  children,
}: TimelineProviderProps) {
  const [project, dispatch] = useReducer(timelineReducer, initialProject);

  const setPlayhead = useCallback((timeMs: number) => {
    dispatch({
      type: "playhead/set",
      timeMs,
    });
  }, []);

  const setZoom = useCallback((pixelsPerSecond: number) => {
    dispatch({
      type: "viewport/zoom",
      pixelsPerSecond,
    });
  }, []);

  const setScrollLeft = useCallback((scrollLeftPx: number) => {
    dispatch({
      type: "viewport/scroll",
      scrollLeftPx,
    });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({
      type: "selection/clear",
    });
  }, []);

  const value = useMemo<TimelineContextValue>(
    () => ({
      project,
      dispatch,
      setPlayhead,
      setZoom,
      setScrollLeft,
      clearSelection,
    }),
    [
      project,
      setPlayhead,
      setZoom,
      setScrollLeft,
      clearSelection,
    ],
  );

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline(): TimelineContextValue {
  const context = useContext(TimelineContext);

  if (!context) {
    throw new Error(
      "useTimeline must be used within a TimelineProvider.",
    );
  }

  return context;
}

export function createEmptyTimelineProject(
  overrides: Partial<TimelineProject> = {},
): TimelineProject {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: "Untitled project",
    durationMs: 0,
    fps: 30,
    width: 1920,
    height: 1080,
    backgroundColor: "#000000",
    tracks: [],
    playheadMs: 0,
    selection: {
      clipIds: [],
      trackIds: [],
    },
    viewport: {
      scrollLeftPx: 0,
      pixelsPerSecond: DEFAULT_PIXELS_PER_SECOND,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}