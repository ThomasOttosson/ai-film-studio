/**
 * Config-driven production wrapper for the editor media realtime integration.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeConfiguredIntegration.tsx
 */

import type { PropsWithChildren, ReactNode } from "react";

import type { EditorMediaRealtimeClient } from "../realtime/editorMediaRealtimeClient";
import type { EditorMediaRealtimeExperienceConfig } from "../realtime/editorMediaRealtimeExperienceConfig";
import { useEditorMediaRealtimeExperienceConfig } from "../realtime/useEditorMediaRealtimeExperienceConfig";
import { EditorMediaRealtimeIntegration } from "./EditorMediaRealtimeIntegration";

export interface EditorMediaRealtimeConfiguredIntegrationProps
  extends PropsWithChildren {
  client: EditorMediaRealtimeClient;
  config?: Partial<EditorMediaRealtimeExperienceConfig>;
  className?: string;
  toolbarLeading?: ReactNode;
  toolbarTrailing?: ReactNode;
}

export function EditorMediaRealtimeConfiguredIntegration({
  client,
  config,
  className,
  toolbarLeading,
  toolbarTrailing,
  children,
}: EditorMediaRealtimeConfiguredIntegrationProps) {
  const resolvedConfig = useEditorMediaRealtimeExperienceConfig(config);

  if (!resolvedConfig.enabled) {
    return <>{children}</>;
  }

  return (
    <EditorMediaRealtimeIntegration
      client={client}
      enabled={resolvedConfig.enabled}
      className={className}
      toolbarLeading={toolbarLeading}
      toolbarTrailing={toolbarTrailing}
    >
      {children}
    </EditorMediaRealtimeIntegration>
  );
}