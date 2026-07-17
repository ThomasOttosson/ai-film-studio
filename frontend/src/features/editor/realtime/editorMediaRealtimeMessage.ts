/**
 * Type-safe parsing for editor media realtime messages.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimeMessage.ts
 */

export type EditorMediaRealtimeMessageType =
  | "media.created"
  | "media.updated"
  | "media.deleted"
  | "job.started"
  | "job.progress"
  | "job.completed"
  | "job.failed"
  | "ping"
  | "pong";

export interface EditorMediaRealtimeMessage<TPayload = unknown> {
  type: EditorMediaRealtimeMessageType;
  payload: TPayload;
  timestamp?: string;
  requestId?: string;
}

const EDITOR_MEDIA_REALTIME_MESSAGE_TYPES: ReadonlySet<string> = new Set([
  "media.created",
  "media.updated",
  "media.deleted",
  "job.started",
  "job.progress",
  "job.completed",
  "job.failed",
  "ping",
  "pong",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEditorMediaRealtimeMessageType(
  value: unknown,
): value is EditorMediaRealtimeMessageType {
  return (
    typeof value === "string" &&
    EDITOR_MEDIA_REALTIME_MESSAGE_TYPES.has(value)
  );
}

export function isEditorMediaRealtimeMessage(
  value: unknown,
): value is EditorMediaRealtimeMessage {
  if (!isRecord(value)) {
    return false;
  }

  if (!isEditorMediaRealtimeMessageType(value.type)) {
    return false;
  }

  if (
    value.timestamp !== undefined &&
    typeof value.timestamp !== "string"
  ) {
    return false;
  }

  if (
    value.requestId !== undefined &&
    typeof value.requestId !== "string"
  ) {
    return false;
  }

  return "payload" in value;
}

export function parseEditorMediaRealtimeMessage(
  input: string | unknown,
): EditorMediaRealtimeMessage | null {
  let value: unknown = input;

  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return null;
    }
  }

  return isEditorMediaRealtimeMessage(value) ? value : null;
}