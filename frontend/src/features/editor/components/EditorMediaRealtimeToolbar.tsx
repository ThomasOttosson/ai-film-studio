/**
 * Toolbar composition for editor media realtime connection and job progress.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeToolbar.tsx
 */

import type { ReactNode } from "react";

import { EditorMediaRealtimeConnectionStatus } from "./EditorMediaRealtimeConnectionStatus";
import { EditorMediaRealtimeProgress } from "./EditorMediaRealtimeProgress";

export interface EditorMediaRealtimeToolbarProps {
  className?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  showConnectionLabel?: boolean;
  progressLabel?: string;
  hideProgressWhenIdle?: boolean;
}

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

export function EditorMediaRealtimeToolbar({
  className,
  leading,
  trailing,
  showConnectionLabel = true,
  progressLabel = "AI processing",
  hideProgressWhenIdle = true,
}: EditorMediaRealtimeToolbarProps) {
  return (
    <div
      className={joinClassNames(
        "editor-media-realtime-toolbar",
        className,
      )}
      aria-label="Editor realtime status"
    >
      {leading ? (
        <div className="editor-media-realtime-toolbar__leading">
          {leading}
        </div>
      ) : null}

      <div className="editor-media-realtime-toolbar__status">
        <EditorMediaRealtimeConnectionStatus
          showLabel={showConnectionLabel}
        />
      </div>

      <div className="editor-media-realtime-toolbar__progress">
        <EditorMediaRealtimeProgress
          label={progressLabel}
          hideWhenIdle={hideProgressWhenIdle}
        />
      </div>

      {trailing ? (
        <div className="editor-media-realtime-toolbar__trailing">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}