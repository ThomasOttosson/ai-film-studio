/**
 * Combines initial media loading with realtime asset synchronization.
 *
 * Placement:
 * frontend/src/features/editor/hooks/useRealtimeEditorMediaAssets.ts
 */

import {
  useCallback,
  useState,
} from "react";

import {
  useEditorMediaAssets,
  type UseEditorMediaAssetsOptions,
  type UseEditorMediaAssetsResult,
} from "./useEditorMediaAssets";
import {
  useEditorMediaRealtime,
  type EditorMediaRealtimeStatus,
} from "./useEditorMediaRealtime";

export interface UseRealtimeEditorMediaAssetsOptions
  extends UseEditorMediaAssetsOptions {
  realtimeEnabled?: boolean;
  realtimeUrl?: string;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
}

export interface UseRealtimeEditorMediaAssetsResult
  extends UseEditorMediaAssetsResult {
  realtimeStatus:
    EditorMediaRealtimeStatus;
  realtimeError: Error | null;
}

export function useRealtimeEditorMediaAssets({
  projectId = null,
  realtimeEnabled = true,
  realtimeUrl = "/api/ws/media",
  reconnectDelayMs,
  maxReconnectDelayMs,
  ...mediaOptions
}: UseRealtimeEditorMediaAssetsOptions = {}): UseRealtimeEditorMediaAssetsResult {
  const media =
    useEditorMediaAssets({
      ...mediaOptions,
      projectId,
    });

  const [
    realtimeStatus,
    setRealtimeStatus,
  ] =
    useState<EditorMediaRealtimeStatus>(
      realtimeEnabled
        ? "connecting"
        : "closed",
    );

  const [
    realtimeError,
    setRealtimeError,
  ] = useState<Error | null>(null);

  const handleStatusChange =
    useCallback(
      (
        status:
          EditorMediaRealtimeStatus,
      ) => {
        setRealtimeStatus(status);

        if (status === "open") {
          setRealtimeError(null);
        }
      },
      [],
    );

  const handleRealtimeError =
    useCallback((error: Error) => {
      setRealtimeError(error);
    }, []);

  useEditorMediaRealtime({
    projectId,
    url: realtimeUrl,
    enabled:
      realtimeEnabled &&
      mediaOptions.enabled !== false,
    reconnectDelayMs,
    maxReconnectDelayMs,
    onAssetCreated: media.addAsset,
    onAssetUpdated: media.replaceAsset,
    onAssetDeleted: media.removeAsset,
    onStatusChange:
      handleStatusChange,
    onError: handleRealtimeError,
  });

  return {
    ...media,
    realtimeStatus,
    realtimeError,
  };
}

export default useRealtimeEditorMediaAssets;