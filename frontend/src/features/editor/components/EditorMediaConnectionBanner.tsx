/**
 * Default realtime status renderer for editor media workspaces.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaConnectionBanner.tsx
 */

import EditorMediaRealtimeStatus from "./EditorMediaRealtimeStatus";
import {
  type EditorMediaRealtimeStatus as RealtimeStatus,
} from "../hooks/useEditorMediaRealtime";

export interface EditorMediaConnectionBannerProps {
  status: Exclude<
    RealtimeStatus,
    "open"
  >;
  error?: Error | null;
}

export function EditorMediaConnectionBanner({
  status,
  error = null,
}: EditorMediaConnectionBannerProps) {
  return (
    <div className="editor-media-connection-banner">
      <EditorMediaRealtimeStatus
        status={status}
        error={error}
      />
    </div>
  );
}

export default EditorMediaConnectionBanner;