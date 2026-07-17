/**
 * WebSocket transport for editor media realtime events.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimeSocket.ts
 */

import {
  createEditorMediaRealtimeHeartbeat,
  type EditorMediaRealtimeHeartbeatController,
} from "./editorMediaRealtimeHeartbeat";
import {
  parseEditorMediaRealtimeMessage,
  type EditorMediaRealtimeMessage,
} from "./editorMediaRealtimeMessage";

export interface EditorMediaRealtimeSocketOptions {
  url: string;
  heartbeatIntervalMs: number;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: EditorMediaRealtimeMessage) => void;
}

export interface EditorMediaRealtimeSocket {
  connect(): void;
  disconnect(code?: number, reason?: string): void;
  send(payload: unknown): boolean;
  getReadyState(): number;
}

export function createEditorMediaRealtimeSocket({
  url,
  heartbeatIntervalMs,
  onOpen,
  onClose,
  onError,
  onMessage,
}: EditorMediaRealtimeSocketOptions): EditorMediaRealtimeSocket {
  let socket: WebSocket | null = null;
  let heartbeat: EditorMediaRealtimeHeartbeatController | null = null;
  let intentionallyClosed = false;

  const send = (payload: unknown): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(
      typeof payload === "string"
        ? payload
        : JSON.stringify(payload),
    );

    return true;
  };

  const stopHeartbeat = (): void => {
    heartbeat?.stop();
    heartbeat = null;
  };

  const connect = (): void => {
    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    intentionallyClosed = false;
    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      heartbeat = createEditorMediaRealtimeHeartbeat({
        intervalMs: heartbeatIntervalMs,
        isConnected: () => socket?.readyState === WebSocket.OPEN,
        send: () => {
          send({
            type: "ping",
            payload: {},
            timestamp: new Date().toISOString(),
          });
        },
      });

      heartbeat.start();
      onOpen?.();
    });

    socket.addEventListener("message", (event) => {
      const message = parseEditorMediaRealtimeMessage(event.data);

      if (message) {
        onMessage?.(message);
      }
    });

    socket.addEventListener("error", (event) => {
      onError?.(event);
    });

    socket.addEventListener("close", (event) => {
      stopHeartbeat();
      socket = null;

      if (!intentionallyClosed) {
        onClose?.(event);
      }
    });
  };

  return {
    connect,

    disconnect(code = 1000, reason = "Client disconnect") {
      intentionallyClosed = true;
      stopHeartbeat();

      if (
        socket &&
        (socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING)
      ) {
        socket.close(code, reason);
      }

      socket = null;
    },

    send,

    getReadyState() {
      return socket?.readyState ?? WebSocket.CLOSED;
    },
  };
}