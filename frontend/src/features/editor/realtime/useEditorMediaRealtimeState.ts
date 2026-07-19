import type { EditorMediaRealtimeState } from "./editorMediaRealtimeReducer";
import { useEditorMediaRealtimeStore } from "./EditorMediaRealtimeStoreProvider";

export function useEditorMediaRealtimeState(): EditorMediaRealtimeState {
  return useEditorMediaRealtimeStore().state;
}

export default useEditorMediaRealtimeState;