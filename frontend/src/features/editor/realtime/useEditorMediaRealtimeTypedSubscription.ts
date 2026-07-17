/**
 * React hook for typed editor media realtime subscriptions.
 *
 * Placement:
 * frontend/src/features/editor/realtime/useEditorMediaRealtimeTypedSubscription.ts
 */

import { useEffect, useRef } from "react";

import type { EditorMediaRealtimeClient } from "./editorMediaRealtimeClient";
import type {
  EditorMediaRealtimeTypedHandler,
} from "./editorMediaRealtimeTypedSubscription";
import { subscribeToEditorMediaRealtimeEvent } from "./editorMediaRealtimeTypedSubscription";
import type { EditorMediaRealtimePayloadMap } from "./editorMediaRealtimePayloads";

export interface UseEditorMediaRealtimeTypedSubscriptionOptions<
  TType extends keyof EditorMediaRealtimePayloadMap,
> {
  client: EditorMediaRealtimeClient;
  type: TType;
  handler: EditorMediaRealtimeTypedHandler<TType>;
  enabled?: boolean;
}

export function useEditorMediaRealtimeTypedSubscription<
  TType extends keyof EditorMediaRealtimePayloadMap,
>({
  client,
  type,
  handler,
  enabled = true,
}: UseEditorMediaRealtimeTypedSubscriptionOptions<TType>): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribeToEditorMediaRealtimeEvent(
      client,
      type,
      (message) => {
        handlerRef.current(message);
      },
    );
  }, [client, enabled, type]);
}