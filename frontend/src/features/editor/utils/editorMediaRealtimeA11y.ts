/**
 * Accessibility helpers for editor media realtime UI.
 *
 * Placement:
 * frontend/src/features/editor/utils/editorMediaRealtimeA11y.ts
 */

export type EditorMediaRealtimeConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type EditorMediaRealtimeJobState =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

const CONNECTION_LABELS: Readonly<
  Record<EditorMediaRealtimeConnectionState, string>
> = {
  connecting: "Connecting to realtime updates",
  connected: "Realtime updates connected",
  reconnecting: "Reconnecting to realtime updates",
  disconnected: "Realtime updates disconnected",
  error: "Realtime connection error",
};

const JOB_LABELS: Readonly<Record<EditorMediaRealtimeJobState, string>> = {
  queued: "AI job queued",
  processing: "AI job processing",
  completed: "AI job completed",
  failed: "AI job failed",
  cancelled: "AI job cancelled",
};

export function getEditorMediaRealtimeConnectionLabel(
  state: EditorMediaRealtimeConnectionState,
): string {
  return CONNECTION_LABELS[state];
}

export function getEditorMediaRealtimeJobLabel(
  state: EditorMediaRealtimeJobState,
  progress?: number,
): string {
  const baseLabel = JOB_LABELS[state];

  if (state !== "processing" || progress === undefined) {
    return baseLabel;
  }

  const normalizedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  return `${baseLabel}, ${normalizedProgress}%`;
}

export function createEditorMediaRealtimeAnnouncement(options: {
  connectionState?: EditorMediaRealtimeConnectionState;
  jobState?: EditorMediaRealtimeJobState;
  progress?: number;
  message?: string;
}): string {
  const parts: string[] = [];

  if (options.connectionState) {
    parts.push(
      getEditorMediaRealtimeConnectionLabel(options.connectionState),
    );
  }

  if (options.jobState) {
    parts.push(
      getEditorMediaRealtimeJobLabel(options.jobState, options.progress),
    );
  }

  const message = options.message?.trim();

  if (message) {
    parts.push(message);
  }

  return parts.join(". ");
}