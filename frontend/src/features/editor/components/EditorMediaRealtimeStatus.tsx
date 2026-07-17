/**
 * Displays the editor media realtime connection state.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeStatus.tsx
 */

import {
  type HTMLAttributes,
} from "react";

import {
  type EditorMediaRealtimeStatus as RealtimeStatus,
} from "../hooks/useEditorMediaRealtime";

export interface EditorMediaRealtimeStatusProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
  > {
  status: RealtimeStatus;
  error?: Error | null;
  showWhenConnected?: boolean;
}

const STATUS_LABELS: Record<
  RealtimeStatus,
  string
> = {
  connecting:
    "Ansluter till realtidsuppdateringar…",
  open: "Realtidsanslutningen är aktiv.",
  closed:
    "Realtidsanslutningen är frånkopplad. Återansluter…",
  error:
    "Realtidsanslutningen kunde inte upprättas.",
};

export function EditorMediaRealtimeStatus({
  status,
  error = null,
  showWhenConnected = false,
  className,
  ...props
}: EditorMediaRealtimeStatusProps) {
  if (
    status === "open" &&
    !showWhenConnected
  ) {
    return null;
  }

  const classes = [
    "editor-media-realtime-status",
    `editor-media-realtime-status--${status}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...props}
      className={classes}
      role={
        status === "error"
          ? "alert"
          : "status"
      }
      aria-live={
        status === "error"
          ? "assertive"
          : "polite"
      }
    >
      <span
        className="editor-media-realtime-status__indicator"
        aria-hidden="true"
      />

      <span className="editor-media-realtime-status__message">
        {error?.message ??
          STATUS_LABELS[status]}
      </span>
    </div>
  );
}

export default EditorMediaRealtimeStatus;