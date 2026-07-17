/**
 * Persists timeline project state and restores compatible snapshots.
 *
 * Placement:
 * frontend/src/features/editor/state/TimelinePersistence.tsx
 */

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { useTimeline } from "./TimelineProvider";
import type { TimelineProject } from "../types/timeline";

const DEFAULT_STORAGE_KEY =
  "ai-film-studio:timeline-project";
const DEFAULT_DEBOUNCE_MS = 500;
const SNAPSHOT_VERSION = 1;

interface TimelineSnapshot {
  version: number;
  savedAt: string;
  project: TimelineProject;
}

export interface TimelinePersistenceProps {
  children?: ReactNode;
  storageKey?: string;
  debounceMs?: number;
  onSaveError?: (error: unknown) => void;
}

function createSnapshot(
  project: TimelineProject,
): TimelineSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    savedAt: new Date().toISOString(),
    project: {
      ...project,
      selection: {
        clipIds: [],
        trackIds: [],
      },
    },
  };
}

export function parseTimelineSnapshot(
  rawValue: string,
): TimelineProject | null {
  try {
    const value: unknown = JSON.parse(rawValue);

    if (
      typeof value !== "object" ||
      value === null
    ) {
      return null;
    }

    const snapshot = value as Partial<TimelineSnapshot>;

    if (
      snapshot.version !== SNAPSHOT_VERSION ||
      typeof snapshot.project !== "object" ||
      snapshot.project === null ||
      !Array.isArray(snapshot.project.tracks)
    ) {
      return null;
    }

    return snapshot.project;
  } catch {
    return null;
  }
}

export function loadTimelineProject(
  storageKey = DEFAULT_STORAGE_KEY,
): TimelineProject | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue =
      window.localStorage.getItem(storageKey);

    return rawValue
      ? parseTimelineSnapshot(rawValue)
      : null;
  } catch {
    return null;
  }
}

export function clearTimelineProject(
  storageKey = DEFAULT_STORAGE_KEY,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}

export function TimelinePersistence({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onSaveError,
}: TimelinePersistenceProps) {
  const { project } = useTimeline();
  const timeoutRef = useRef<number | null>(null);
  const latestProjectRef =
    useRef<TimelineProject>(project);

  useEffect(() => {
    latestProjectRef.current = project;

    if (typeof window === "undefined") {
      return;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      try {
        const snapshot = createSnapshot(
          latestProjectRef.current,
        );

        window.localStorage.setItem(
          storageKey,
          JSON.stringify(snapshot),
        );
      } catch (error) {
        onSaveError?.(error);
      } finally {
        timeoutRef.current = null;
      }
    }, Math.max(0, debounceMs));

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    debounceMs,
    onSaveError,
    project,
    storageKey,
  ]);

  useEffect(
    () => () => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        const snapshot = createSnapshot(
          latestProjectRef.current,
        );

        window.localStorage.setItem(
          storageKey,
          JSON.stringify(snapshot),
        );
      } catch (error) {
        onSaveError?.(error);
      }
    },
    [onSaveError, storageKey],
  );

  return <>{children}</>;
}