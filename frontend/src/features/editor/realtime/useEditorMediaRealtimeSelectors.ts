import { useMemo } from "react";

import type { EditorMediaRealtimeJobState } from "./editorMediaRealtimeReducer";
import { useEditorMediaRealtimeState } from "./useEditorMediaRealtimeState";

export interface EditorMediaRealtimeSelectors {
  runningJobs: EditorMediaRealtimeJobState[];
  completedJobs: EditorMediaRealtimeJobState[];
  failedJobs: EditorMediaRealtimeJobState[];
  hasRunningJobs: boolean;
}

export function useEditorMediaRealtimeSelectors():
  EditorMediaRealtimeSelectors {
  const state = useEditorMediaRealtimeState();

  return useMemo(() => {
    const jobs = Object.values(state.activeJobs);

    const runningJobs = jobs.filter(
      (job) => job.status === "running",
    );

    const completedJobs = jobs.filter(
      (job) => job.status === "completed",
    );

    const failedJobs = jobs.filter(
      (job) => job.status === "failed",
    );

    return {
      runningJobs,
      completedJobs,
      failedJobs,
      hasRunningJobs: runningJobs.length > 0,
    };
  }, [state.activeJobs]);
}

export default useEditorMediaRealtimeSelectors;