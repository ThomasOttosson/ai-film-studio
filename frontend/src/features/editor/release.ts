/**
 * Placement:
 * frontend/src/features/editor/release.ts
 *
 * Release descriptor used by deployment tooling.
 */

import { EDITOR_MEDIA_REALTIME_VERSION } from "./version";
import { EDITOR_READY } from "./ready";

export const EDITOR_RELEASE = Object.freeze({
  name: "AI Film Studio Editor",
  version: EDITOR_MEDIA_REALTIME_VERSION,
  ready: EDITOR_READY.ready,
  stability: "stable",
} as const);

export type EditorRelease = typeof EDITOR_RELEASE;