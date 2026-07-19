/**
 * Derives presentation-ready realtime job activity for editor UI surfaces.
 *
 * Placement:
 * frontend/src/features/editor/hooks/useEditorMediaRealtimeJobActivity.ts
 */

import { useMemo } from "react";

import type { EditorMediaRealtimeJobState } from "../realtime/editorMediaRealtimeReducer";
import { useEditorMediaRealtimeSelectors } from "../realtime/useEditorMediaRealtimeSelectors";

export interface EditorMediaRealtimeJobActivityItem {
  jobId: string;
  label: string;
  status: EditorMediaRealtimeJobState["status"];
  progress: number;
  message: string | null;
  error: string | null;
}

export interface EditorMediaRealtimeJobActivity {
  items: EditorMediaRealtimeJobActivityItem[];
  runningCount: number;
  completedCount: number;
  failedCount: number;
  hasActivity: boolean;
}

function normalizeProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(progress)));
}

function toActivityItem(
  job: EditorMediaRealtimeJobState,
): EditorMediaRealtimeJobActivityItem {
  return {
    jobId: job.jobId,
    label: job.action ?? "AI action",
    status: job.status,
    progress: normalizeProgress(job.progress),
    message: job.message ?? null,
    error: job.error ?? null,
  };
}

export function useEditorMediaRealtimeJobActivity(): EditorMediaRealtimeJobActivity {
  const {
    runningJobs,
    completedJobs,
    failedJobs,
  } = useEditorMediaRealtimeSelectors();

  return useMemo(() => {
    const items = [
      ...runningJobs.map(toActivityItem),
      ...failedJobs.map(toActivityItem),
      ...completedJobs.map(toActivityItem),
    ];

    return {
      items,
      runningCount: runningJobs.length,
      completedCount: completedJobs.length,
      failedCount: failedJobs.length,
      hasActivity: items.length > 0,
    };
  }, [completedJobs, failedJobs, runningJobs]);
}