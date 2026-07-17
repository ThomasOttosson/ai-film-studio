/**
 * Composes the reducer-backed realtime store with job activity UI.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeWorkspaceEnhancer.tsx
 */

import type { PropsWithChildren, ReactNode } from "react";

import {
  EditorMediaRealtimeStoreProvider,
} from "../realtime/EditorMediaRealtimeStoreProvider";
import type { EditorMediaRealtimeClient } from "../realtime/editorMediaRealtimeClient";
import type { EditorMediaRealtimeState } from "../realtime/editorMediaRealtimeReducer";
import { EditorMediaRealtimeJobActivity } from "./EditorMediaRealtimeJobActivity";
import "../styles/editorMediaRealtimeJobActivity.css";

export interface EditorMediaRealtimeWorkspaceEnhancerProps
  extends PropsWithChildren {
  client: EditorMediaRealtimeClient;
  enabled?: boolean;
  initialState?: EditorMediaRealtimeState;
  activityClassName?: string;
  showCompletedJobs?: boolean;
  showFailedJobs?: boolean;
  renderActivity?: (activity: ReactNode) => ReactNode;
}

export function EditorMediaRealtimeWorkspaceEnhancer({
  client,
  enabled = true,
  initialState,
  activityClassName,
  showCompletedJobs = false,
  showFailedJobs = true,
  renderActivity,
  children,
}: EditorMediaRealtimeWorkspaceEnhancerProps) {
  const activity = (
    <EditorMediaRealtimeJobActivity
      className={activityClassName}
      showCompleted={showCompletedJobs}
      showFailed={showFailedJobs}
    />
  );

  return (
    <EditorMediaRealtimeStoreProvider
      client={client}
      enabled={enabled}
      initialState={initialState}
    >
      {renderActivity ? renderActivity(activity) : activity}
      {children}
    </EditorMediaRealtimeStoreProvider>
  );
}