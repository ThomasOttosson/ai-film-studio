/**
 * Convenience hook for subscribing to editor media and AI job realtime events.
 *
 * Placement:
 * frontend/src/features/editor/realtime/useEditorMediaRealtimeEvents.ts
 */

import type { EditorMediaRealtimeClient } from "./editorMediaRealtimeClient";
import type { EditorMediaRealtimeMessageHandler } from "./editorMediaRealtimeDispatcher";
import { useEditorMediaRealtimeSubscription } from "./useEditorMediaRealtimeSubscription";

export interface EditorMediaRealtimeEventHandlers {
  onMediaCreated?: EditorMediaRealtimeMessageHandler;
  onMediaUpdated?: EditorMediaRealtimeMessageHandler;
  onMediaDeleted?: EditorMediaRealtimeMessageHandler;
  onJobStarted?: EditorMediaRealtimeMessageHandler;
  onJobProgress?: EditorMediaRealtimeMessageHandler;
  onJobCompleted?: EditorMediaRealtimeMessageHandler;
  onJobFailed?: EditorMediaRealtimeMessageHandler;
}

export interface UseEditorMediaRealtimeEventsOptions
  extends EditorMediaRealtimeEventHandlers {
  client: EditorMediaRealtimeClient;
  enabled?: boolean;
}

const noopHandler: EditorMediaRealtimeMessageHandler = () => undefined;

export function useEditorMediaRealtimeEvents({
  client,
  enabled = true,
  onMediaCreated,
  onMediaUpdated,
  onMediaDeleted,
  onJobStarted,
  onJobProgress,
  onJobCompleted,
  onJobFailed,
}: UseEditorMediaRealtimeEventsOptions): void {
  useEditorMediaRealtimeSubscription({
    client,
    type: "media.created",
    enabled: enabled && Boolean(onMediaCreated),
    handler: onMediaCreated ?? noopHandler,
  });

  useEditorMediaRealtimeSubscription({
    client,
    type: "media.updated",
    enabled: enabled && Boolean(onMediaUpdated),
    handler: onMediaUpdated ?? noopHandler,
  });

  useEditorMediaRealtimeSubscription({
    client,
    type: "media.deleted",
    enabled: enabled && Boolean(onMediaDeleted),
    handler: onMediaDeleted ?? noopHandler,
  });

  useEditorMediaRealtimeSubscription({
    client,
    type: "job.started",
    enabled: enabled && Boolean(onJobStarted),
    handler: onJobStarted ?? noopHandler,
  });

  useEditorMediaRealtimeSubscription({
    client,
    type: "job.progress",
    enabled: enabled && Boolean(onJobProgress),
    handler: onJobProgress ?? noopHandler,
  });

  useEditorMediaRealtimeSubscription({
    client,
    type: "job.completed",
    enabled: enabled && Boolean(onJobCompleted),
    handler: onJobCompleted ?? noopHandler,
  });

  useEditorMediaRealtimeSubscription({
    client,
    type: "job.failed",
    enabled: enabled && Boolean(onJobFailed),
    handler: onJobFailed ?? noopHandler,
  });
}