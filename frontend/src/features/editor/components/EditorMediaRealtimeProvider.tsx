/**
 * Shared realtime connection provider for editor media components.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeProvider.tsx
 */

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";

import {
  useEditorMediaRealtime,
  type EditorMediaRealtimeOptions,
} from "../hooks/useEditorMediaRealtime";

export type EditorMediaRealtimeContextValue =
  ReturnType<typeof useEditorMediaRealtime>;

const EditorMediaRealtimeContext =
  createContext<EditorMediaRealtimeContextValue | null>(null);

export interface EditorMediaRealtimeProviderProps
  extends PropsWithChildren,
    EditorMediaRealtimeOptions {}

export function EditorMediaRealtimeProvider({
  children,
  ...options
}: EditorMediaRealtimeProviderProps) {
  const realtime = useEditorMediaRealtime(options);

  const value = useMemo<EditorMediaRealtimeContextValue>(
    () => realtime,
    [realtime],
  );

  return (
    <EditorMediaRealtimeContext.Provider value={value}>
      {children}
    </EditorMediaRealtimeContext.Provider>
  );
}

export function useEditorMediaRealtimeContext(): EditorMediaRealtimeContextValue {
  const context = useContext(EditorMediaRealtimeContext);

  if (!context) {
    throw new Error(
      "useEditorMediaRealtimeContext must be used within an EditorMediaRealtimeProvider.",
    );
  }

  return context;
}

export default EditorMediaRealtimeProvider;