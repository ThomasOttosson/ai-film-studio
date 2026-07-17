/**
 * Focused selectors for editor media realtime assets and jobs.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimeSelectors.ts
 */

import type { EditorMediaRealtimeAsset } from "./editorMediaRealtimePayloads";
import type {
  EditorMediaRealtimeJobState,
  EditorMediaRealtimeState,
} from "./editorMediaRealtimeReducer";

export function selectEditorMediaAssets(
  state: EditorMediaRealtimeState,
): EditorMediaRealtimeAsset[] {
  return state.assets;
}

export function selectEditorMediaAssetById(
  state: EditorMediaRealtimeState,
  assetId: string,
): EditorMediaRealtimeAsset | undefined {
  return state.assets.find((asset) => asset.id === assetId);
}

export function selectEditorMediaJobs(
  state: EditorMediaRealtimeState,
): EditorMediaRealtimeJobState[] {
  return Object.values(state.activeJobs);
}

export function selectEditorMediaJobById(
  state: EditorMediaRealtimeState,
  jobId: string,
): EditorMediaRealtimeJobState | undefined {
  return state.activeJobs[jobId];
}

export function selectRunningEditorMediaJobs(
  state: EditorMediaRealtimeState,
): EditorMediaRealtimeJobState[] {
  return selectEditorMediaJobs(state).filter(
    (job) => job.status === "running",
  );
}

export function selectCompletedEditorMediaJobs(
  state: EditorMediaRealtimeState,
): EditorMediaRealtimeJobState[] {
  return selectEditorMediaJobs(state).filter(
    (job) => job.status === "completed",
  );
}

export function selectFailedEditorMediaJobs(
  state: EditorMediaRealtimeState,
): EditorMediaRealtimeJobState[] {
  return selectEditorMediaJobs(state).filter(
    (job) => job.status === "failed",
  );
}

export function selectHasRunningEditorMediaJobs(
  state: EditorMediaRealtimeState,
): boolean {
  return selectRunningEditorMediaJobs(state).length > 0;
}

export function selectLatestEditorMediaAsset(
  state: EditorMediaRealtimeState,
): EditorMediaRealtimeAsset | null {
  return state.assets[0] ?? null;
}