/**
 * Default realtime boundary fallback composition for the editor media workspace.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeFallback.tsx
 */

import type { ReactNode } from "react";

import EditorMediaRealtimeErrorFallback from "./EditorMediaRealtimeErrorFallback";
import EditorMediaRealtimeLoadingFallback from "./EditorMediaRealtimeLoadingFallback";

export type EditorMediaRealtimeFallbackStatus =
  | "connecting"
  | "closed"
  | "error";

export interface EditorMediaRealtimeFallbackProps {
  status: EditorMediaRealtimeFallbackStatus;
  error?: Error | null;
  onRetry?: () => void;
  connectingLabel?: ReactNode;
  reconnectingLabel?: ReactNode;
  retryLabel?: string;
}

export function EditorMediaRealtimeFallback({
  status,
  error = null,
  onRetry,
  connectingLabel = "Ansluter till realtidsuppdateringar…",
  reconnectingLabel = "Återansluter till realtidsuppdateringar…",
  retryLabel = "Försök igen",
}: EditorMediaRealtimeFallbackProps) {
  if (status === "error") {
    return (
      <EditorMediaRealtimeErrorFallback
        error={error}
        onRetry={onRetry}
        retryLabel={retryLabel}
      />
    );
  }

  return (
    <EditorMediaRealtimeLoadingFallback
      label={
        status === "closed"
          ? reconnectingLabel
          : connectingLabel
      }
    />
  );
}

export default EditorMediaRealtimeFallback;