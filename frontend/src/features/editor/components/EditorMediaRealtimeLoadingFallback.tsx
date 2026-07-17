/**
 * Accessible loading state for the editor media realtime connection.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeLoadingFallback.tsx
 */

import {
  type HTMLAttributes,
  type ReactNode,
} from "react";

export interface EditorMediaRealtimeLoadingFallbackProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label?: ReactNode;
}

export function EditorMediaRealtimeLoadingFallback({
  label = "Ansluter till realtidsuppdateringar…",
  className,
  ...props
}: EditorMediaRealtimeLoadingFallbackProps) {
  const classes = [
    "editor-media-realtime-loading-fallback",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...props}
      className={classes}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="editor-media-realtime-loading-fallback__spinner"
        aria-hidden="true"
      />

      <span className="editor-media-realtime-loading-fallback__label">
        {label}
      </span>
    </div>
  );
}

export default EditorMediaRealtimeLoadingFallback;