/**
 * Mounts the editor's global timeline keyboard shortcuts.
 *
 * Placement:
 * frontend/src/features/editor/components/TimelineKeyboardShortcuts.tsx
 */

import { useTimelineKeyboardShortcuts } from "../hooks/useTimelineKeyboardShortcuts";

export interface TimelineKeyboardShortcutsProps {
  enabled?: boolean;
  preventDefault?: boolean;
}

export function TimelineKeyboardShortcuts({
  enabled = true,
  preventDefault = true,
}: TimelineKeyboardShortcutsProps) {
  useTimelineKeyboardShortcuts({
    enabled,
    preventDefault,
  });

  return null;
}

export default TimelineKeyboardShortcuts;