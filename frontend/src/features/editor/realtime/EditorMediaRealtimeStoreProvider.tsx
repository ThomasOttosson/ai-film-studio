import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type PropsWithChildren,
} from "react";

import type { EditorMediaRealtimeClient } from "./editorMediaRealtimeClient";
import {
  editorMediaRealtimeReducer,
  initialEditorMediaRealtimeState,
  type EditorMediaRealtimeReducerAction,
  type EditorMediaRealtimeState,
} from "./editorMediaRealtimeReducer";
import { useEditorMediaRealtimeEvents } from "./useEditorMediaRealtimeEvents";

export interface EditorMediaRealtimeStoreContextValue {
  state: EditorMediaRealtimeState;
  dispatch: Dispatch<EditorMediaRealtimeReducerAction>;
}

const EditorMediaRealtimeStoreContext =
  createContext<EditorMediaRealtimeStoreContextValue | null>(null);

export interface EditorMediaRealtimeStoreProviderProps
  extends PropsWithChildren {
  client: EditorMediaRealtimeClient;
  enabled?: boolean;
  initialState?: EditorMediaRealtimeState;
}

export function EditorMediaRealtimeStoreProvider({
  client,
  enabled = true,
  initialState = initialEditorMediaRealtimeState,
  children,
}: EditorMediaRealtimeStoreProviderProps) {
  const [state, dispatch] = useReducer(
    editorMediaRealtimeReducer,
    initialState,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    client.connect();

    return () => {
      client.disconnect();
    };
  }, [client, enabled]);

  useEditorMediaRealtimeEvents({
    client,
    enabled,
    onMediaCreated: (message) => {
      dispatch({
        type: "media.created",
        payload: message.payload,
      });
    },
    onMediaUpdated: (message) => {
      dispatch({
        type: "media.updated",
        payload: message.payload,
      });
    },
    onMediaDeleted: (message) => {
      dispatch({
        type: "media.deleted",
        payload: message.payload,
      });
    },
    onJobStarted: (message) => {
      dispatch({
        type: "job.started",
        payload: message.payload,
      });
    },
    onJobProgress: (message) => {
      dispatch({
        type: "job.progress",
        payload: message.payload,
      });
    },
    onJobCompleted: (message) => {
      dispatch({
        type: "job.completed",
        payload: message.payload,
      });
    },
    onJobFailed: (message) => {
      dispatch({
        type: "job.failed",
        payload: message.payload,
      });
    },
  });

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
    }),
    [state],
  );

  return (
    <EditorMediaRealtimeStoreContext.Provider value={contextValue}>
      {children}
    </EditorMediaRealtimeStoreContext.Provider>
  );
}

export function useEditorMediaRealtimeStore():
  EditorMediaRealtimeStoreContextValue {
  const context = useContext(EditorMediaRealtimeStoreContext);

  if (!context) {
    throw new Error(
      "useEditorMediaRealtimeStore must be used within an EditorMediaRealtimeStoreProvider.",
    );
  }

  return context;
}