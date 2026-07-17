/**
 * React hook for subscribing to one editor media realtime message type.
 *
 * Placement:
 * frontend/src/features/editor/realtime/useEditorMediaRealtimeSubscription.ts
 */

import { useEffect, useRef } from "react";

import type {
  EditorMediaRealtimeClient,
} from "./editorMediaRealtimeClient";
import type {
  EditorMediaRealtimeMessageHandler,
} from "./editorMediaRealtimeDispatcher";
import type {
  EditorMediaRealtimeMessageType,
} from "./editorMediaRealtimeMessage";

export interface UseEditorMediaRealtimeSubscriptionOptions<
  TPayload = unknown,
> {
  client: EditorMediaRealtimeClient;
  type: EditorMediaRealtimeMessageType;
  handler: EditorMediaRealtimeMessageHandler<TPayload>;
  enabled?: boolean;
}

export function useEditorMediaRealtimeSubscription<
  TPayload = unknown,
>({
  client,
  type,
  handler,
  enabled = true,
}: UseEditorMediaRealtimeSubscriptionOptions<TPayload>): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return client.subscribe<TPayload>(type, (message) => {
      handlerRef.current(message);
    });
  }, [client, enabled, type]);
}