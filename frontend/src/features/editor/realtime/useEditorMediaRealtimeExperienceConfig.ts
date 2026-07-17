/**
 * Memoized access to the production editor media realtime experience config.
 *
 * Placement:
 * frontend/src/features/editor/realtime/useEditorMediaRealtimeExperienceConfig.ts
 */

import { useMemo } from "react";

import {
  createEditorMediaRealtimeExperienceConfig,
  type EditorMediaRealtimeExperienceConfig,
} from "./editorMediaRealtimeExperienceConfig";

export function useEditorMediaRealtimeExperienceConfig(
  overrides?: Partial<EditorMediaRealtimeExperienceConfig>,
): EditorMediaRealtimeExperienceConfig {
  return useMemo(
    () => createEditorMediaRealtimeExperienceConfig(overrides),
    [
      overrides?.enabled,
      overrides?.announceUpdates,
      overrides?.showConnectionLabel,
      overrides?.showCompletedJobs,
      overrides?.showFailedJobs,
      overrides?.hideProgressWhenIdle,
      overrides?.progressLabel,
      overrides?.url,
      overrides?.protocols,
      overrides?.heartbeatIntervalMs,
      overrides?.connectionTimeoutMs,
      overrides?.maxReconnectAttempts,
      overrides?.backoff,
    ],
  );
}