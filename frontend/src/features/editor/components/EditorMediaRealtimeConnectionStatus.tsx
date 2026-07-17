/**
 * Connection status indicator for the editor media realtime client.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeConnectionStatus.tsx
 */

import { useMemo } from "react";

import { useEditorMediaRealtimeStatus } from "../hooks/useEditorMediaRealtimeStatus";

export interface EditorMediaRealtimeConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
  connectedLabel?: string;
  connectingLabel?: string;
  disconnectedLabel?: string;
  errorLabel?: string;
}

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

export function EditorMediaRealtimeConnectionStatus({
  className,
  showLabel = true,
  connectedLabel = "Realtime connected",
  connectingLabel = "Realtime connecting",
  disconnectedLabel = "Realtime disconnected",
  errorLabel = "Realtime connection error",
}: EditorMediaRealtimeConnectionStatusProps) {
  const status = useEditorMediaRealtimeStatus();

  const label = useMemo(() => {
    switch (status) {
      case "connected":
        return connectedLabel;
      case "connecting":
        return connectingLabel;
      case "error":
        return errorLabel;
      case "disconnected":
      default:
        return disconnectedLabel;
    }
  }, [
    connectedLabel,
    connectingLabel,
    disconnectedLabel,
    errorLabel,
    status,
  ]);

  return (
    <div
      className={joinClassNames(
        "editor-media-realtime-connection-status",
        className,
      )}
      data-status={status}
      role="status"
      aria-live="polite"
      aria-label={label}
      title={label}
    >
      <span
        className="editor-media-realtime-connection-status__indicator"
        aria-hidden="true"
      />
      {showLabel ? (
        <span className="editor-media-realtime-connection-status__label">
          {label}
        </span>
      ) : null}
    </div>
  );
}