/**
 * Memoized runtime configuration for editor media realtime connections.
 *
 * Placement:
 * frontend/src/features/editor/realtime/useEditorMediaRealtimeConfig.ts
 */

import { useMemo } from "react";

import {
  createEditorMediaRealtimeConfig,
  type CreateEditorMediaRealtimeConfigOptions,
  type EditorMediaRealtimeConfig,
} from "./editorMediaRealtimeConfig";

export function useEditorMediaRealtimeConfig(
  options: CreateEditorMediaRealtimeConfigOptions = {},
): EditorMediaRealtimeConfig {
  const {
    url,
    reconnectDelayMs,
    maxReconnectDelayMs,
    heartbeatIntervalMs,
  } = options;

  return useMemo(
    () =>
      createEditorMediaRealtimeConfig({
        url,
        reconnectDelayMs,
        maxReconnectDelayMs,
        heartbeatIntervalMs,
      }),
    [
      url,
      reconnectDelayMs,
      maxReconnectDelayMs,
      heartbeatIntervalMs,
    ],
  );
}

export default useEditorMediaRealtimeConfig;