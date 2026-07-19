/**
 * Keeps editor media assets synchronized with backend realtime events.
 *
 * Placement:
 * frontend/src/features/editor/hooks/useEditorMediaRealtime.ts
 */

import {
  useEffect,
  useRef,
} from "react";

import {
  type EditorMediaAsset,
} from "../components/MediaPanelLibrary";

export type EditorMediaRealtimeStatus =
  | "connecting"
  | "open"
  | "closed"
  | "error";

export interface EditorMediaRealtimeHandlers {
  onAssetCreated?: (
    asset: EditorMediaAsset,
  ) => void;
  onAssetUpdated?: (
    asset: EditorMediaAsset,
  ) => void;
  onAssetDeleted?: (
    assetId: string,
  ) => void;
  onStatusChange?: (
    status: EditorMediaRealtimeStatus,
  ) => void;
  onError?: (
    error: Error,
  ) => void;
}

export interface UseEditorMediaRealtimeOptions
  extends EditorMediaRealtimeHandlers {
  projectId?: string | null;
  url?: string;
  enabled?: boolean;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
}

interface MediaRealtimeEnvelope {
  type:
    | "media.created"
    | "media.updated"
    | "media.deleted"
    | "ping";
  projectId?: string;
  asset?: EditorMediaAsset;
  assetId?: string;
}

function resolveWebSocketUrl(
  url: string,
  projectId: string | null,
): string {
  const resolved = new URL(
    url,
    window.location.origin,
  );

  if (
    resolved.protocol === "http:"
  ) {
    resolved.protocol = "ws:";
  } else if (
    resolved.protocol === "https:"
  ) {
    resolved.protocol = "wss:";
  }

  if (projectId) {
    resolved.searchParams.set(
      "projectId",
      projectId,
    );
  }

  return resolved.toString();
}

function parseEnvelope(
  value: string,
): MediaRealtimeEnvelope | null {
  try {
    const parsed =
      JSON.parse(value) as unknown;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("type" in parsed) ||
      typeof parsed.type !== "string"
    ) {
      return null;
    }

    return parsed as MediaRealtimeEnvelope;
  } catch {
    return null;
  }
}

export function useEditorMediaRealtime({
  projectId = null,
  url = "/api/ws/media",
  enabled = true,
  reconnectDelayMs = 1_000,
  maxReconnectDelayMs = 15_000,
  onAssetCreated,
  onAssetUpdated,
  onAssetDeleted,
  onStatusChange,
  onError,
}: UseEditorMediaRealtimeOptions = {}): void {
  const handlersRef =
    useRef<EditorMediaRealtimeHandlers>({
      onAssetCreated,
      onAssetUpdated,
      onAssetDeleted,
      onStatusChange,
      onError,
    });

  handlersRef.current = {
    onAssetCreated,
    onAssetUpdated,
    onAssetDeleted,
    onStatusChange,
    onError,
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer:
      | ReturnType<typeof setTimeout>
      | null = null;
    let reconnectAttempt = 0;
    let disposed = false;

    const notifyStatus = (
      status: EditorMediaRealtimeStatus,
    ): void => {
      handlersRef.current
        .onStatusChange?.(status);
    };

    const scheduleReconnect = (): void => {
      if (disposed || reconnectTimer) {
        return;
      }

      const delay = Math.min(
        reconnectDelayMs *
          2 ** reconnectAttempt,
        maxReconnectDelayMs,
      );

      reconnectAttempt += 1;

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = (): void => {
      if (disposed) {
        return;
      }

      notifyStatus("connecting");

      try {
        socket = new WebSocket(
          resolveWebSocketUrl(
            url,
            projectId,
          ),
        );
      } catch (cause) {
        const error =
          cause instanceof Error
            ? cause
            : new Error(
                "Kunde inte skapa mediaanslutningen.",
              );

        notifyStatus("error");
        handlersRef.current
          .onError?.(error);
        scheduleReconnect();
        return;
      }

      socket.addEventListener(
        "open",
        () => {
          reconnectAttempt = 0;
          notifyStatus("open");
        },
      );

      socket.addEventListener(
        "message",
        (event) => {
          if (
            typeof event.data !== "string"
          ) {
            return;
          }

          const envelope =
            parseEnvelope(event.data);

          if (
            !envelope ||
            envelope.type === "ping"
          ) {
            return;
          }

          if (
            projectId &&
            envelope.projectId &&
            envelope.projectId !==
              projectId
          ) {
            return;
          }

          switch (envelope.type) {
            case "media.created":
              if (envelope.asset) {
                handlersRef.current
                  .onAssetCreated?.(
                    envelope.asset,
                  );
              }
              break;

            case "media.updated":
              if (envelope.asset) {
                handlersRef.current
                  .onAssetUpdated?.(
                    envelope.asset,
                  );
              }
              break;

            case "media.deleted":
              if (envelope.assetId) {
                handlersRef.current
                  .onAssetDeleted?.(
                    envelope.assetId,
                  );
              }
              break;
          }
        },
      );

      socket.addEventListener(
        "error",
        () => {
          const error = new Error(
            "Mediaanslutningen fick ett fel.",
          );

          notifyStatus("error");
          handlersRef.current
            .onError?.(error);
        },
      );

      socket.addEventListener(
        "close",
        () => {
          socket = null;
          notifyStatus("closed");
          scheduleReconnect();
        },
      );
    };

    connect();

    return () => {
      disposed = true;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (
        socket &&
        socket.readyState <
          WebSocket.CLOSING
      ) {
        socket.close(
          1000,
          "Editor media hook disposed",
        );
      }
    };
  }, [
    enabled,
    maxReconnectDelayMs,
    projectId,
    reconnectDelayMs,
    url,
  ]);
}

export default useEditorMediaRealtime;