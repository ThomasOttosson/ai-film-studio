/**
 * Production composition for editor media realtime state, activity, and
 * accessibility announcements.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeExperience.tsx
 */

import type { PropsWithChildren, ReactNode } from "react";

import type { EditorMediaRealtimeClient } from "../realtime/editorMediaRealtimeClient";
import type { EditorMediaRealtimeState } from "../realtime/editorMediaRealtimeReducer";
import { EditorMediaRealtimeAnnouncements } from "./EditorMediaRealtimeAnnouncements";
import { EditorMediaRealtimeWorkspaceEnhancer } from "./EditorMediaRealtimeWorkspaceEnhancer";

export interface EditorMediaRealtimeExperienceProps extends PropsWithChildren {
  client: EditorMediaRealtimeClient;
  enabled?: boolean;
  initialState?: EditorMediaRealtimeState;
  activityClassName?: string;
  announcementClassName?: string;
  showCompletedJobs?: boolean;
  showFailedJobs?: boolean;
  renderActivity?: (activity: ReactNode) => ReactNode;
}

export function EditorMediaRealtimeExperience({
  client,
  enabled = true,
  initialState,
  activityClassName,
  announcementClassName,
  showCompletedJobs = false,
  showFailedJobs = true,
  renderActivity,
  children,
}: EditorMediaRealtimeExperienceProps) {
  return (
    <EditorMediaRealtimeWorkspaceEnhancer
      client={client}
      enabled={enabled}
      initialState={initialState}
      activityClassName={activityClassName}
      showCompletedJobs={showCompletedJobs}
      showFailedJobs={showFailedJobs}
      renderActivity={renderActivity}
    >
      <EditorMediaRealtimeAnnouncements
        className={announcementClassName}
      />
      {children}
    </EditorMediaRealtimeWorkspaceEnhancer>
  );
}