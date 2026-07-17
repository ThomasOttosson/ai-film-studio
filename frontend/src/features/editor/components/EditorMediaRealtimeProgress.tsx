/**
 * Compact aggregate progress indicator for editor media realtime jobs.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeProgress.tsx
 */

import { useMemo } from "react";

import { useEditorMediaRealtimeJobActivity } from "../hooks/useEditorMediaRealtimeJobActivity";

export interface EditorMediaRealtimeProgressProps {
  className?: string;
  label?: string;
  hideWhenIdle?: boolean;
}

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

export function EditorMediaRealtimeProgress({
  className,
  label = "AI processing",
  hideWhenIdle = true,
}: EditorMediaRealtimeProgressProps) {
  const {
    items,
    runningCount,
    failedCount,
  } = useEditorMediaRealtimeJobActivity();

  const runningItems = useMemo(
    () => items.filter((item) => item.status === "running"),
    [items],
  );

  const aggregateProgress = useMemo(() => {
    if (runningItems.length === 0) {
      return 0;
    }

    const total = runningItems.reduce(
      (sum, item) => sum + item.progress,
      0,
    );

    return Math.round(total / runningItems.length);
  }, [runningItems]);

  if (hideWhenIdle && runningCount === 0 && failedCount === 0) {
    return null;
  }

  const statusText =
    runningCount > 0
      ? `${runningCount} ${runningCount === 1 ? "job" : "jobs"} running`
      : failedCount > 0
        ? `${failedCount} ${failedCount === 1 ? "job" : "jobs"} failed`
        : "Idle";

  return (
    <div
      className={joinClassNames(
        "editor-media-realtime-progress",
        className,
      )}
      data-running={runningCount > 0 ? "true" : "false"}
      data-failed={failedCount > 0 ? "true" : "false"}
      aria-live="polite"
    >
      <div className="editor-media-realtime-progress__header">
        <span>{label}</span>
        <span>{statusText}</span>
      </div>

      <progress
        max={100}
        value={aggregateProgress}
        aria-label={`${label}: ${aggregateProgress}%`}
      />

      <span className="editor-media-realtime-progress__value">
        {aggregateProgress}%
      </span>
    </div>
  );
}