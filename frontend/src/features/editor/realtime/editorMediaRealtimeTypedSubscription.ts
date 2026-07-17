/**
 * Typed subscription helpers for editor media realtime messages.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimeTypedSubscription.ts
 */

import type { EditorMediaRealtimeClient } from "./editorMediaRealtimeClient";
import type { EditorMediaRealtimeMessage } from "./editorMediaRealtimeMessage";
import type { EditorMediaRealtimePayloadMap } from "./editorMediaRealtimePayloads";

export type EditorMediaRealtimeTypedMessage<
  TType extends keyof EditorMediaRealtimePayloadMap,
> = EditorMediaRealtimeMessage<EditorMediaRealtimePayloadMap[TType]> & {
  type: TType;
};

export type EditorMediaRealtimeTypedHandler<
  TType extends keyof EditorMediaRealtimePayloadMap,
> = (message: EditorMediaRealtimeTypedMessage<TType>) => void;

export function subscribeToEditorMediaRealtimeEvent<
  TType extends keyof EditorMediaRealtimePayloadMap,
>(
  client: EditorMediaRealtimeClient,
  type: TType,
  handler: EditorMediaRealtimeTypedHandler<TType>,
): () => void {
  return client.subscribe<EditorMediaRealtimePayloadMap[TType]>(
    type,
    (message) => {
      handler(message as EditorMediaRealtimeTypedMessage<TType>);
    },
  );
}