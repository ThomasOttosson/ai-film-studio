/**
 * Declarative realtime state renderer for editor media components.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeState.tsx
 */

import type { ReactNode } from "react";

import EditorMediaRealtimeFallback, {
  type EditorMediaRealtimeFallbackStatus,
} from "./EditorMediaRealtimeFallback";

export interface EditorMediaRealtimeStateProps {
  status: "connected" | EditorMediaRealtimeFallbackStatus;
  children: ReactNode;
  error?: Error | null;
  onRetry?: () => void;
  connectingLabel?: ReactNode;
  reconnectingLabel?: ReactNode;
  retryLabel?: string;
}

export function EditorMediaRealtimeState({
  status,
  children,
  error = null,
  onRetry,
  connectingLabel,
  reconnectingLabel,
  retryLabel,
}: EditorMediaRealtimeStateProps) {
  if (status === "connected") {
    return <>{children}</>;
  }

  return (
    <EditorMediaRealtimeFallback
      status={status}
      error={error}
      onRetry={onRetry}
      connectingLabel={connectingLabel}
      reconnectingLabel={reconnectingLabel}
      retryLabel={retryLabel}
    />
  );
}

export default EditorMediaRealtimeState;