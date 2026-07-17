/**
 * Announces editor media realtime job state changes to assistive technologies.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeAnnouncements.tsx
 */

import { useEffect, useRef, useState } from "react";

import { useEditorMediaRealtimeJobActivity } from "../hooks/useEditorMediaRealtimeJobActivity";

export interface EditorMediaRealtimeAnnouncementsProps {
  className?: string;
  clearDelayMs?: number;
}

const DEFAULT_CLEAR_DELAY_MS = 5_000;

export function EditorMediaRealtimeAnnouncements({
  className,
  clearDelayMs = DEFAULT_CLEAR_DELAY_MS,
}: EditorMediaRealtimeAnnouncementsProps) {
  const {
    items,
    runningCount,
    completedCount,
    failedCount,
  } = useEditorMediaRealtimeJobActivity();

  const previousStatusesRef = useRef(new Map<string, string>());
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const previousStatuses = previousStatusesRef.current;
    const messages: string[] = [];

    for (const item of items) {
      const previousStatus = previousStatuses.get(item.jobId);

      if (!previousStatus && item.status === "running") {
        messages.push(`${item.label} started.`);
      } else if (
        previousStatus &&
        previousStatus !== item.status &&
        item.status === "completed"
      ) {
        messages.push(`${item.label} completed.`);
      } else if (
        previousStatus &&
        previousStatus !== item.status &&
        item.status === "failed"
      ) {
        messages.push(
          `${item.label} failed${item.error ? `: ${item.error}` : "."}`,
        );
      }

      previousStatuses.set(item.jobId, item.status);
    }

    const currentIds = new Set(items.map((item) => item.jobId));

    for (const jobId of previousStatuses.keys()) {
      if (!currentIds.has(jobId)) {
        previousStatuses.delete(jobId);
      }
    }

    if (messages.length === 0) {
      return;
    }

    setAnnouncement(messages.join(" "));

    const timeoutId = window.setTimeout(() => {
      setAnnouncement("");
    }, Math.max(0, clearDelayMs));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [clearDelayMs, items]);

  const summary = `${runningCount} running, ${completedCount} completed, ${failedCount} failed.`;

  return (
    <div
      className={className}
      aria-live="polite"
      aria-atomic="true"
      role="status"
      data-realtime-job-summary={summary}
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {announcement}
    </div>
  );
}