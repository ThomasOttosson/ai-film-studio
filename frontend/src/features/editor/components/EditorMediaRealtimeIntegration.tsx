/**
 * Production composition for mounting the editor media realtime shell around
 * the existing editor workspace.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeIntegration.tsx
 */

import type { PropsWithChildren, ReactNode } from "react";

import type { EditorMediaRealtimeClient } from "../realtime/editorMediaRealtimeClient";
import type { EditorMediaRealtimeState } from "../realtime/editorMediaRealtimeReducer";
import { EditorMediaRealtimeShell } from "./EditorMediaRealtimeShell";

export interface EditorMediaRealtimeIntegrationProps extends PropsWithChildren {
  client: EditorMediaRealtimeClient;
  enabled?: boolean;
  initialState?: EditorMediaRealtimeState;
  className?: string;
  toolbarLeading?: ReactNode;
  toolbarTrailing?: ReactNode;
}

export function EditorMediaRealtimeIntegration({
  client,
  enabled = true,
  initialState,
  className,
  toolbarLeading,
  toolbarTrailing,
  children,
}: EditorMediaRealtimeIntegrationProps) {
  return (
    <EditorMediaRealtimeShell
      client={client}
      enabled={enabled}
      initialState={initialState}
      className={className}
      toolbarLeading={toolbarLeading}
      toolbarTrailing={toolbarTrailing}
      showConnectionLabel
      progressLabel="AI processing"
      hideProgressWhenIdle
      showCompletedJobs={false}
      showFailedJobs
    >
      {children}
    </EditorMediaRealtimeShell>
  );
}