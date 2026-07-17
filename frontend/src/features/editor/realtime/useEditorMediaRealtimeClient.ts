/**
 * React lifecycle hook for the editor media realtime client.
 *
 * Placement:
 * frontend/src/features/editor/realtime/useEditorMediaRealtimeClient.ts
 */

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createEditorMediaRealtimeClient,
  type EditorMediaRealtimeClient,
  type EditorMediaRealtimeClientOptions,
  type EditorMediaRealtimeClientStatus,
} from "./editorMediaRealtimeClient";

export interface UseEditorMediaRealtimeClientOptions
  extends Omit<EditorMediaRealtimeClientOptions, "onStatusChange"> {
  enabled?: boolean;
  onStatusChange?: (status: EditorMediaRealtimeClientStatus) => void;
}

export interface UseEditorMediaRealtimeClientResult {
  client: EditorMediaRealtimeClient;
  status: EditorMediaRealtimeClientStatus;
  connect(): void;
  disconnect(): void;
  send(payload: unknown): boolean;
}

export function useEditorMediaRealtimeClient({
  enabled = true,
  onStatusChange,
  ...options
}: UseEditorMediaRealtimeClientOptions): UseEditorMediaRealtimeClientResult {
  const statusHandlerRef = useRef(onStatusChange);
  statusHandlerRef.current = onStatusChange;

  const [status, setStatus] =
    useState<EditorMediaRealtimeClientStatus>("idle");

  const client = useMemo(
    () =>
      createEditorMediaRealtimeClient({
        ...options,
        onStatusChange: (nextStatus) => {
          setStatus(nextStatus);
          statusHandlerRef.current?.(nextStatus);
        },
      }),
    [
      options.url,
      options.heartbeatIntervalMs,
      options.reconnectInitialDelayMs,
      options.reconnectMaxDelayMs,
      options.reconnectJitterRatio,
      options.onError,
    ],
  );

  useEffect(() => {
    if (enabled) {
      client.connect();
    } else {
      client.disconnect();
    }

    return () => {
      client.disconnect();
    };
  }, [client, enabled]);

  return {
    client,
    status,

    connect() {
      client.connect();
    },

    disconnect() {
      client.disconnect();
    },

    send(payload) {
      return client.send(payload);
    },
  };
}