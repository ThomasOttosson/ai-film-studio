import {
  type CSSProperties,
  useMemo,
} from "react";

import {
  useAIActions,
} from "../providers/AIActionProvider";
import {
  type AIActionJob,
} from "../hooks/useAIActionStream";


export interface AIActionStatusPanelProps {
  clipId?: string;
  projectId?: string;
  maxJobs?: number;
  showCompleted?: boolean;
  className?: string;
  onOpenResult?: (
    job: AIActionJob,
  ) => void;
}


const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "100%",
  padding: "16px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "12px",
  background:
    "rgba(20, 20, 24, 0.92)",
  boxSizing: "border-box",
};


const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};


const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "0.01em",
};


const connectionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  opacity: 0.78,
};


const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};


const jobStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "12px",
  borderRadius: "10px",
  background:
    "rgba(255, 255, 255, 0.055)",
};


const jobHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};


const jobTitleStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};


const actionStyle: CSSProperties = {
  overflow: "hidden",
  fontSize: "13px",
  fontWeight: 650,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};


const clipStyle: CSSProperties = {
  overflow: "hidden",
  marginTop: "2px",
  fontSize: "11px",
  opacity: 0.6,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};


const statusStyle: CSSProperties = {
  flexShrink: 0,
  padding: "3px 7px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  background:
    "rgba(255, 255, 255, 0.08)",
};


const progressTrackStyle: CSSProperties = {
  overflow: "hidden",
  width: "100%",
  height: "6px",
  borderRadius: "999px",
  background:
    "rgba(255, 255, 255, 0.08)",
};


const progressBarStyle: CSSProperties = {
  height: "100%",
  borderRadius: "inherit",
  background: "currentColor",
  transition:
    "width 180ms ease-out",
};


const progressFooterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  fontSize: "11px",
  opacity: 0.72,
};


const errorStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  lineHeight: 1.45,
  color: "#ff9d9d",
};


const emptyStyle: CSSProperties = {
  margin: 0,
  padding: "8px 0",
  fontSize: "12px",
  opacity: 0.62,
};


const buttonRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
};


const buttonStyle: CSSProperties = {
  padding: "6px 10px",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: "7px",
  background:
    "rgba(255, 255, 255, 0.07)",
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
  fontSize: "11px",
  fontWeight: 650,
};


function connectionLabel(
  status:
    | "idle"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "closed"
    | "error",
): string {
  switch (status) {
    case "connected":
      return "Live";
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting";
    case "error":
      return "Connection error";
    case "closed":
      return "Offline";
    default:
      return "Idle";
  }
}


function connectionSymbol(
  status:
    | "idle"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "closed"
    | "error",
): string {
  switch (status) {
    case "connected":
      return "●";
    case "connecting":
    case "reconnecting":
      return "◌";
    case "error":
      return "!";
    default:
      return "○";
  }
}


function statusLabel(
  job: AIActionJob,
): string {
  switch (job.status) {
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "deleted":
      return "Deleted";
    default:
      return job.status;
  }
}


function progressLabel(
  job: AIActionJob,
): string {
  if (job.status === "completed") {
    return "Ready";
  }

  if (job.status === "failed") {
    return "Stopped";
  }

  if (job.status === "queued") {
    return "Waiting";
  }

  return `${job.progress}%`;
}


function jobTimestamp(
  job: AIActionJob,
): string | null {
  const raw =
    job.updatedAt ??
    job.createdAt;

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);

  if (
    Number.isNaN(parsed.getTime())
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(parsed);
}


function AIActionJobRow({
  job,
  onOpenResult,
  onDelete,
}: {
  job: AIActionJob;
  onOpenResult?: (
    job: AIActionJob,
  ) => void;
  onDelete: (
    jobId: string,
  ) => Promise<void>;
}) {
  const timestamp = jobTimestamp(job);
  const canOpen =
    job.status === "completed" &&
    job.result !== null &&
    Boolean(onOpenResult);
  const canDelete =
    job.status !== "processing";

  return (
    <article
      style={jobStyle}
      aria-label={`${job.action} ${statusLabel(
        job,
      )}`}
    >
      <div style={jobHeaderStyle}>
        <div style={jobTitleStyle}>
          <span style={actionStyle}>
            {job.action}
          </span>
          <span style={clipStyle}>
            Clip: {job.clipId}
          </span>
        </div>

        <span style={statusStyle}>
          {statusLabel(job)}
        </span>
      </div>

      <div
        style={progressTrackStyle}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={job.progress}
        aria-label={`${job.action} progress`}
      >
        <div
          style={{
            ...progressBarStyle,
            width: `${job.progress}%`,
          }}
        />
      </div>

      <div style={progressFooterStyle}>
        <span>{progressLabel(job)}</span>
        {timestamp ? (
          <time dateTime={job.updatedAt}>
            {timestamp}
          </time>
        ) : null}
      </div>

      {job.error ? (
        <p style={errorStyle}>
          {job.error}
        </p>
      ) : null}

      {canOpen || canDelete ? (
        <div style={buttonRowStyle}>
          {canOpen ? (
            <button
              type="button"
              style={buttonStyle}
              onClick={() =>
                onOpenResult?.(job)
              }
            >
              Open result
            </button>
          ) : null}

          {canDelete ? (
            <button
              type="button"
              style={buttonStyle}
              onClick={() => {
                void onDelete(job.id);
              }}
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}


export function AIActionStatusPanel({
  clipId,
  projectId,
  maxJobs = 8,
  showCompleted = true,
  className,
  onOpenResult,
}: AIActionStatusPanelProps) {
  const {
    orderedJobs,
    streamStatus,
    streamError,
    requestError,
    deleteJob,
  } = useAIActions();

  const visibleJobs = useMemo(
    () =>
      orderedJobs
        .filter((job) => {
          if (
            clipId &&
            job.clipId !== clipId
          ) {
            return false;
          }

          if (
            !showCompleted &&
            job.status === "completed"
          ) {
            return false;
          }

          return true;
        })
        .slice(
          0,
          Math.max(1, maxJobs),
        ),
    [
      clipId,
      maxJobs,
      orderedJobs,
      showCompleted,
    ],
  );

  const visibleError =
    requestError ?? streamError;

  return (
    <section
      className={className}
      style={panelStyle}
      aria-label={
        projectId
          ? `AI jobs for project ${projectId}`
          : "AI jobs"
      }
    >
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          AI jobs
        </h2>

        <span
          style={connectionStyle}
          aria-label={`Realtime status: ${connectionLabel(
            streamStatus,
          )}`}
        >
          <span aria-hidden="true">
            {connectionSymbol(
              streamStatus,
            )}
          </span>
          {connectionLabel(
            streamStatus,
          )}
        </span>
      </div>

      {visibleError ? (
        <p style={errorStyle}>
          {visibleError}
        </p>
      ) : null}

      {visibleJobs.length > 0 ? (
        <div style={listStyle}>
          {visibleJobs.map((job) => (
            <AIActionJobRow
              key={job.id}
              job={job}
              onOpenResult={
                onOpenResult
              }
              onDelete={deleteJob}
            />
          ))}
        </div>
      ) : (
        <p style={emptyStyle}>
          No AI jobs yet.
        </p>
      )}
    </section>
  );
}
