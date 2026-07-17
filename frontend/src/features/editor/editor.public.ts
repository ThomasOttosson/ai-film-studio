/**
 * Placement:
 * frontend/src/features/editor/editor.public.ts
 *
 * Stable production entrypoint for the completed editor realtime feature.
 * This intentionally avoids modifying the protected editor/index.ts barrel.
 */

export * from "./components/index.public";
export * from "./realtime/index.public";
export * from "./utils/editorMediaRealtimeA11y";