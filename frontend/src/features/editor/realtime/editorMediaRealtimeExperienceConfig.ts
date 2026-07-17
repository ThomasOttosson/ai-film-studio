/**
 * Production defaults for the editor media realtime experience.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimeExperienceConfig.ts
 */

import type { EditorMediaRealtimeConfig } from "./editorMediaRealtimeConfig";

export interface EditorMediaRealtimeExperienceConfig
  extends EditorMediaRealtimeConfig {
  enabled: boolean;
  announceUpdates: boolean;
  showConnectionLabel: boolean;
  showCompletedJobs: boolean;
  showFailedJobs: boolean;
  hideProgressWhenIdle: boolean;
  progressLabel: string;
}

export const DEFAULT_EDITOR_MEDIA_REALTIME_EXPERIENCE_CONFIG: Readonly<
  EditorMediaRealtimeExperienceConfig
> = Object.freeze({
  enabled: true,
  announceUpdates: true,
  showConnectionLabel: true,
  showCompletedJobs: false,
  showFailedJobs: true,
  hideProgressWhenIdle: true,
  progressLabel: "AI processing",
});

export function createEditorMediaRealtimeExperienceConfig(
  overrides: Partial<EditorMediaRealtimeExperienceConfig> = {},
): EditorMediaRealtimeExperienceConfig {
  return {
    ...DEFAULT_EDITOR_MEDIA_REALTIME_EXPERIENCE_CONFIG,
    ...overrides,
  };
}