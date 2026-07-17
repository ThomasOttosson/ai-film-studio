/**
 * Production-ready realtime media workspace for the editor.
 *
 * Placement:
 * frontend/src/features/editor/components/RealtimeEditorMediaWorkspace.tsx
 */

import {
  type ComponentProps,
  type ReactNode,
} from "react";

import EditorMediaRealtimeBoundary from "./EditorMediaRealtimeBoundary";
import RealtimeEditorMediaWorkspaceContainer from "./RealtimeEditorMediaWorkspaceContainer";
import {
  useEditorMediaRealtime,
  type EditorMediaRealtimeOptions,
} from "../hooks/useEditorMediaRealtime";

type WorkspaceProps = ComponentProps<
  typeof RealtimeEditorMediaWorkspaceContainer
>;

export interface RealtimeEditorMediaWorkspaceProps
  extends Omit<
      WorkspaceProps,
      "realtime"
    >,
    EditorMediaRealtimeOptions {
  connectionFallback?: ReactNode;
  className?: string;
}

export function RealtimeEditorMediaWorkspace({
  connectionFallback = null,
  className,
  ...props
}: RealtimeEditorMediaWorkspaceProps) {
  const realtime =
    useEditorMediaRealtime(props);

  return (
    <EditorMediaRealtimeBoundary
      className={className}
      status={realtime.status}
      error={realtime.error}
      fallback={connectionFallback}
    >
      <RealtimeEditorMediaWorkspaceContainer
        {...props}
        realtime={realtime}
      />
    </EditorMediaRealtimeBoundary>
  );
}

export default RealtimeEditorMediaWorkspace;