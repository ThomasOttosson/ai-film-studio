/**
 * Compact realtime job activity summary for the editor workspace.
 *
 * Placement:
 * frontend/src/features/editor/components/EditorMediaRealtimeJobActivity.tsx
 */

import { useEditorMediaRealtimeSelectors } from "../realtime/useEditorMediaRealtimeSelectors";

export interface EditorMediaRealtimeJobActivityProps {
  className?: string;
  showCompleted?: boolean;
  showFailed?: boolean;
}

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

export function EditorMediaRealtimeJobActivity({
  className,
  showCompleted = false,
  showFailed = true,
}: EditorMediaRealtimeJobActivityProps) {
  const {
    runningJobs,
    completedJobs,
    failedJobs,
    hasRunningJobs,
  } = useEditorMediaRealtimeSelectors();

  const isEmpty =
    !hasRunningJobs &&
    (!showCompleted || completedJobs.length === 0) &&
    (!showFailed || failedJobs.length === 0);

  if (isEmpty) {
    return null;
  }

  return (
    <section
      className={joinClassNames(
        "editor-media-realtime-job-activity",
        className,
      )}
      aria-label="AI job activity"
      aria-live="polite"
    >
      {runningJobs.map((job) => (
        <article
          key={job.jobId}
          className="editor-media-realtime-job-activity__item"
          data-status={job.status}
        >
          <div className="editor-media-realtime-job-activity__header">
            <strong>{job.action ?? "AI action"}</strong>
            <span>{Math.round(job.progress)}%</span>
          </div>

          <progress
            max={100}
            value={Math.min(100, Math.max(0, job.progress))}
            aria-label={`${job.action ?? "AI action"} progress`}
          />

          {job.message ? (
            <p className="editor-media-realtime-job-activity__message">
              {job.message}
            </p>
          ) : null}
        </article>
      ))}

      {showCompleted && completedJobs.length > 0 ? (
        <p className="editor-media-realtime-job-activity__summary">
          {completedJobs.length} completed
        </p>
      ) : null}

      {showFailed && failedJobs.length > 0 ? (
        <div className="editor-media-realtime-job-activity__errors">
          {failedJobs.map((job) => (
            <p key={job.jobId} role="alert">
              {job.action ?? "AI action"} failed
              {job.error ? `: ${job.error}` : "."}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}