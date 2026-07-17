/**
 * Reconnecting realtime client for editor media events.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimeClient.ts
 */

import {
  createEditorMediaRealtimeDispatcher,
  type EditorMediaRealtimeDispatcher,
  type EditorMediaRealtimeMessageHandler,
} from "./editorMediaRealtimeDispatcher";
import { getEditorMediaRealtimeReconnectDelay } from "./editorMediaRealtimeBackoff";
import type {
  EditorMediaRealtimeMessage,
  EditorMediaRealtimeMessageType,
} from "./editorMediaRealtimeMessage";
import {
  createEditorMediaRealtimeSocket,
  type EditorMediaRealtimeSocket,
} from "./editorMediaRealtimeSocket";

export type EditorMediaRealtimeClientStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface EditorMediaRealtimeClientOptions {
  url: string;
  heartbeatIntervalMs?: number;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
  reconnectJitterRatio?: number;
  onStatusChange?: (status: EditorMediaRealtimeClientStatus) => void;
  onError?: (event: Event) => void;
}

export interface EditorMediaRealtimeClient {
  connect(): void;
  disconnect(): void;
  send(payload: unknown): boolean;
  subscribe<TPayload = unknown>(
    type: EditorMediaRealtimeMessageType,
    handler: EditorMediaRealtimeMessageHandler<TPayload>,
  ): () => void;
  getStatus(): EditorMediaRealtimeClientStatus;
}

export function createEditorMediaRealtimeClient({
  url,
  heartbeatIntervalMs = 25_000,
  reconnectInitialDelayMs = 1_000,
  reconnectMaxDelayMs = 30_000,
  reconnectJitterRatio = 0.2,
  onStatusChange,
  onError,
}: EditorMediaRealtimeClientOptions): EditorMediaRealtimeClient {
  const dispatcher: EditorMediaRealtimeDispatcher =
    createEditorMediaRealtimeDispatcher();

  let socket: EditorMediaRealtimeSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let shouldReconnect = false;
  let status: EditorMediaRealtimeClientStatus = "idle";

  const setStatus = (nextStatus: EditorMediaRealtimeClientStatus): void => {
    if (status === nextStatus) {
      return;
    }

    status = nextStatus;
    onStatusChange?.(nextStatus);
  };

  const clearReconnectTimer = (): void => {
    if (reconnectTimer === null) {
      return;
    }

    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const handleMessage = (
    message: EditorMediaRealtimeMessage,
  ): void => {
    dispatcher.dispatch(message);
  };

  const scheduleReconnect = (): void => {
    if (!shouldReconnect || reconnectTimer !== null) {
      return;
    }

    setStatus("reconnecting");

    const delay = getEditorMediaRealtimeReconnectDelay({
      attempt: reconnectAttempt,
      initialDelayMs: reconnectInitialDelayMs,
      maxDelayMs: reconnectMaxDelayMs,
      jitterRatio: reconnectJitterRatio,
    });

    reconnectAttempt += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      openSocket();
    }, delay);
  };

  const openSocket = (): void => {
    clearReconnectTimer();
    setStatus(reconnectAttempt > 0 ? "reconnecting" : "connecting");

    socket?.disconnect();
    socket = createEditorMediaRealtimeSocket({
      url,
      heartbeatIntervalMs,
      onOpen: () => {
        reconnectAttempt = 0;
        setStatus("connected");
      },
      onClose: () => {
        socket = null;

        if (shouldReconnect) {
          scheduleReconnect();
        } else {
          setStatus("disconnected");
        }
      },
      onError: (event) => {
        setStatus("error");
        onError?.(event);
      },
      onMessage: handleMessage,
    });

    socket.connect();
  };

  return {
    connect() {
      shouldReconnect = true;

      if (
        status === "connecting" ||
        status === "connected" ||
        status === "reconnecting"
      ) {
        return;
      }

      openSocket();
    },

    disconnect() {
      shouldReconnect = false;
      reconnectAttempt = 0;
      clearReconnectTimer();
      socket?.disconnect();
      socket = null;
      setStatus("disconnected");
    },

    send(payload) {
      return socket?.send(payload) ?? false;
    },

    subscribe<TPayload>(
      type: EditorMediaRealtimeMessageType,
      handler: EditorMediaRealtimeMessageHandler<TPayload>,
    ) {
      return dispatcher.subscribe(type, handler);
    },

    getStatus() {
      return status;
    },
  };
}