/**
 * Normalizes editor media realtime connection state for UI components.
 *
 * Placement:
 * frontend/src/features/editor/hooks/useEditorMediaRealtimeStatus.ts
 */

import { useMemo } from "react";

import {
  createEditorMediaRealtimeStatusSnapshot,
  getEditorMediaRealtimeStatusFromReadyState,
  type EditorMediaRealtimeStatusSnapshot,
} from "../utils/editorMediaRealtimeStatus";

export interface UseEditorMediaRealtimeStatusOptions {
  readyState?: number | null;
  error?: unknown;
}

export function useEditorMediaRealtimeStatus({
  readyState,
  error,
}: UseEditorMediaRealtimeStatusOptions): EditorMediaRealtimeStatusSnapshot {
  return useMemo(() => {
    const status = getEditorMediaRealtimeStatusFromReadyState(
      readyState,
      error,
    );

    return createEditorMediaRealtimeStatusSnapshot(status);
  }, [readyState, error]);
}

export default useEditorMediaRealtimeStatus;