/**
 * High-level editor media realtime shell with provider composition, toolbar,
 * activity rendering, and accessible announcements.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeShell.tsx
 */

import type { PropsWithChildren, ReactNode } from "react";

import type { EditorMediaRealtimeClient } from "../realtime/editorMediaRealtimeClient";
import type { EditorMediaRealtimeState } from "../realtime/editorMediaRealtimeReducer";
import { EditorMediaRealtimeExperience } from "./EditorMediaRealtimeExperience";
import { EditorMediaRealtimeToolbar } from "./EditorMediaRealtimeToolbar";

export interface EditorMediaRealtimeShellProps extends PropsWithChildren {
  client: EditorMediaRealtimeClient;
  enabled?: boolean;
  initialState?: EditorMediaRealtimeState;
  className?: string;
  toolbarClassName?: string;
  activityClassName?: string;
  announcementClassName?: string;
  toolbarLeading?: ReactNode;
  toolbarTrailing?: ReactNode;
  showConnectionLabel?: boolean;
  progressLabel?: string;
  hideProgressWhenIdle?: boolean;
  showCompletedJobs?: boolean;
  showFailedJobs?: boolean;
  renderActivity?: (activity: ReactNode) => ReactNode;
}

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

export function EditorMediaRealtimeShell({
  client,
  enabled = true,
  initialState,
  className,
  toolbarClassName,
  activityClassName,
  announcementClassName,
  toolbarLeading,
  toolbarTrailing,
  showConnectionLabel = true,
  progressLabel = "AI processing",
  hideProgressWhenIdle = true,
  showCompletedJobs = false,
  showFailedJobs = true,
  renderActivity,
  children,
}: EditorMediaRealtimeShellProps) {
  return (
    <EditorMediaRealtimeExperience
      client={client}
      enabled={enabled}
      initialState={initialState}
      activityClassName={activityClassName}
      announcementClassName={announcementClassName}
      showCompletedJobs={showCompletedJobs}
      showFailedJobs={showFailedJobs}
      renderActivity={renderActivity}
    >
      <section
        className={joinClassNames(
          "editor-media-realtime-shell",
          className,
        )}
        data-realtime-enabled={enabled ? "true" : "false"}
      >
        <EditorMediaRealtimeToolbar
          className={toolbarClassName}
          leading={toolbarLeading}
          trailing={toolbarTrailing}
          showConnectionLabel={showConnectionLabel}
          progressLabel={progressLabel}
          hideProgressWhenIdle={hideProgressWhenIdle}
        />

        <div className="editor-media-realtime-shell__content">
          {children}
        </div>
      </section>
    </EditorMediaRealtimeExperience>
  );
}