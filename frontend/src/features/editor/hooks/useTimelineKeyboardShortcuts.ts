/**
 * Global keyboard shortcuts for timeline editing.
 *
 * Placement:
 * frontend/src/features/editor/hooks/useTimelineKeyboardShortcuts.ts
 */

import { useEffect } from "react";

import { useTimeline } from "../state/TimelineProvider";

export interface TimelineKeyboardShortcutOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function useTimelineKeyboardShortcuts({
  enabled = true,
  preventDefault = true,
}: TimelineKeyboardShortcutOptions = {}): void {
  const { project, dispatch } = useTimeline();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (isEditableTarget(event.target)) {
        return;
      }

      const modifierPressed =
        event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (modifierPressed && key === "z") {
        if (preventDefault) {
          event.preventDefault();
        }

        dispatch({
          type: event.shiftKey ? "REDO" : "UNDO",
        });

        return;
      }

      if (
        modifierPressed &&
        (key === "y" ||
          (event.shiftKey && key === "z"))
      ) {
        if (preventDefault) {
          event.preventDefault();
        }

        dispatch({
          type: "REDO",
        });

        return;
      }

      if (
        key === "delete" ||
        key === "backspace"
      ) {
        if (
          project.selection.clipIds.length === 0 &&
          project.selection.trackIds.length === 0
        ) {
          return;
        }

        if (preventDefault) {
          event.preventDefault();
        }

        dispatch({
          type: "DELETE_SELECTION",
        });

        return;
      }

      if (event.code === "Space") {
        if (preventDefault) {
          event.preventDefault();
        }

        dispatch({
          type: "TOGGLE_PLAYBACK",
        });

        return;
      }

      if (key === "arrowleft") {
        if (preventDefault) {
          event.preventDefault();
        }

        dispatch({
          type: "SET_PLAYHEAD",
          playheadMs: Math.max(
            0,
            project.playheadMs -
              (event.shiftKey ? 1_000 : 100),
          ),
        });

        return;
      }

      if (key === "arrowright") {
        if (preventDefault) {
          event.preventDefault();
        }

        dispatch({
          type: "SET_PLAYHEAD",
          playheadMs:
            project.playheadMs +
            (event.shiftKey ? 1_000 : 100),
        });

        return;
      }

      if (key === "home") {
        if (preventDefault) {
          event.preventDefault();
        }

        dispatch({
          type: "SET_PLAYHEAD",
          playheadMs: 0,
        });

        return;
      }

      if (key === "escape") {
        dispatch({
          type: "CLEAR_SELECTION",
        });
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    dispatch,
    enabled,
    preventDefault,
    project.playheadMs,
    project.selection.clipIds.length,
    project.selection.trackIds.length,
  ]);
}