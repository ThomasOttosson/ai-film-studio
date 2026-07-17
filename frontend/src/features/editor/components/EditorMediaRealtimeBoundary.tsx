/**
 * Adds realtime connection feedback around editor media content.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeBoundary.tsx
 */

import {
  type PropsWithChildren,
  type ReactNode,
} from "react";

import EditorMediaConnectionBanner from "./EditorMediaConnectionBanner";
import {
  type EditorMediaRealtimeStatus,
} from "../hooks/useEditorMediaRealtime";

export interface EditorMediaRealtimeBoundaryProps
  extends PropsWithChildren {
  status: EditorMediaRealtimeStatus;
  error?: Error | null;
  fallback?: ReactNode;
  className?: string;
}

export function EditorMediaRealtimeBoundary({
  status,
  error = null,
  fallback = null,
  className,
  children,
}: EditorMediaRealtimeBoundaryProps) {
  const classes = [
    "editor-media-realtime-boundary",
    `editor-media-realtime-boundary--${status}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const shouldShowBanner =
    status !== "open";

  const shouldShowFallback =
    status === "error" &&
    fallback !== null;

  return (
    <section
      className={classes}
      data-realtime-status={status}
      aria-busy={
        status === "connecting"
      }
    >
      {shouldShowBanner ? (
        <EditorMediaConnectionBanner
          status={status}
          error={error}
        />
      ) : null}

      <div className="editor-media-realtime-boundary__content">
        {shouldShowFallback
          ? fallback
          : children}
      </div>
    </section>
  );
}

export default EditorMediaRealtimeBoundary;