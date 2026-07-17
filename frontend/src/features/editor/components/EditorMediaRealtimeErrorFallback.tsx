/**
 * Accessible fallback shown when the editor media realtime connection fails.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeErrorFallback.tsx
 */

import {
  type HTMLAttributes,
} from "react";

export interface EditorMediaRealtimeErrorFallbackProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
  > {
  error?: Error | null;
  onRetry?: () => void;
  retryLabel?: string;
}

export function EditorMediaRealtimeErrorFallback({
  error = null,
  onRetry,
  retryLabel = "Försök igen",
  className,
  ...props
}: EditorMediaRealtimeErrorFallbackProps) {
  const classes = [
    "editor-media-realtime-error-fallback",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...props}
      className={classes}
      role="alert"
    >
      <div className="editor-media-realtime-error-fallback__content">
        <h2 className="editor-media-realtime-error-fallback__title">
          Media kunde inte uppdateras
        </h2>

        <p className="editor-media-realtime-error-fallback__message">
          {error?.message ??
            "Anslutningen till realtidsservern misslyckades. Kontrollera nätverket och försök igen."}
        </p>

        {onRetry ? (
          <button
            className="editor-media-realtime-error-fallback__retry"
            type="button"
            onClick={onRetry}
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default EditorMediaRealtimeErrorFallback;