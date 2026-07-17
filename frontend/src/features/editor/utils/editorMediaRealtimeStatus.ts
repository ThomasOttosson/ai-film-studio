/**
 * Normalized realtime connection state helpers for editor media features.
 *
 * Placement:
 * frontend/src/features/editor/utils/editorMediaRealtimeStatus.ts
 */

export type EditorMediaRealtimeStatus =
  | "connecting"
  | "connected"
  | "closed"
  | "error";

export interface EditorMediaRealtimeStatusSnapshot {
  status: EditorMediaRealtimeStatus;
  isConnecting: boolean;
  isConnected: boolean;
  isClosed: boolean;
  hasError: boolean;
}

export function createEditorMediaRealtimeStatusSnapshot(
  status: EditorMediaRealtimeStatus,
): EditorMediaRealtimeStatusSnapshot {
  return {
    status,
    isConnecting: status === "connecting",
    isConnected: status === "connected",
    isClosed: status === "closed",
    hasError: status === "error",
  };
}

export function getEditorMediaRealtimeStatusFromReadyState(
  readyState: number | null | undefined,
  error?: unknown,
): EditorMediaRealtimeStatus {
  if (error) {
    return "error";
  }

  switch (readyState) {
    case WebSocket.CONNECTING:
      return "connecting";
    case WebSocket.OPEN:
      return "connected";
    case WebSocket.CLOSING:
    case WebSocket.CLOSED:
      return "closed";
    default:
      return "closed";
  }
}

export function isEditorMediaRealtimeAvailable(
  status: EditorMediaRealtimeStatus,
): boolean {
  return status === "connected";
}