/**
 * Heartbeat controller for editor media realtime WebSocket connections.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimeHeartbeat.ts
 */

export interface EditorMediaRealtimeHeartbeatOptions {
  intervalMs: number;
  send: () => void;
  isConnected: () => boolean;
}

export interface EditorMediaRealtimeHeartbeatController {
  start(): void;
  stop(): void;
  restart(): void;
  isRunning(): boolean;
}

export function createEditorMediaRealtimeHeartbeat({
  intervalMs,
  send,
  isConnected,
}: EditorMediaRealtimeHeartbeatOptions): EditorMediaRealtimeHeartbeatController {
  const normalizedIntervalMs =
    Number.isFinite(intervalMs) && intervalMs > 0
      ? intervalMs
      : 25_000;

  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = (): void => {
    if (timer === null) {
      return;
    }

    clearInterval(timer);
    timer = null;
  };

  const start = (): void => {
    if (timer !== null) {
      return;
    }

    timer = setInterval(() => {
      if (!isConnected()) {
        return;
      }

      send();
    }, normalizedIntervalMs);
  };

  return {
    start,
    stop,

    restart() {
      stop();
      start();
    },

    isRunning() {
      return timer !== null;
    },
  };
}