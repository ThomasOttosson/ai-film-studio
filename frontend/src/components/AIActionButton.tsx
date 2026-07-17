import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  useMemo,
  useState,
} from "react";

import {
  type CreateAIActionInput,
  useAIActions,
} from "../providers/AIActionProvider";
import {
  type AIActionJob,
} from "../hooks/useAIActionStream";


export interface AIActionButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick"
  > {
  action: string;
  clipId: string;
  projectId?: string;
  provider?: string;
  parameters?: Record<string, unknown>;
  preventDuplicate?: boolean;
  queuedLabel?: string;
  processingLabel?: string;
  completedLabel?: string;
  failedLabel?: string;
  onCreated?: (
    job: AIActionJob,
  ) => void;
  onFailed?: (
    error: Error,
  ) => void;
}


const defaultButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  minHeight: "38px",
  padding: "8px 14px",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "9px",
  background:
    "rgba(255, 255, 255, 0.08)",
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
  fontSize: "13px",
  fontWeight: 700,
  transition:
    "opacity 140ms ease, transform 140ms ease",
};


const indicatorStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "14px",
  height: "14px",
  flexShrink: 0,
  fontSize: "12px",
};


function latestMatchingJob(
  jobs: AIActionJob[],
  action: string,
  clipId: string,
): AIActionJob | undefined {
  return jobs.find(
    (job) =>
      job.action === action &&
      job.clipId === clipId &&
      job.status !== "deleted",
  );
}


function labelForJob(
  job: AIActionJob | undefined,
  defaultLabel: string,
  labels: {
    queued: string;
    processing: string;
    completed: string;
    failed: string;
  },
): string {
  if (!job) {
    return defaultLabel;
  }

  switch (job.status) {
    case "queued":
      return labels.queued;
    case "processing":
      return labels.processing;
    case "completed":
      return labels.completed;
    case "failed":
      return labels.failed;
    default:
      return defaultLabel;
  }
}


function indicatorForJob(
  job: AIActionJob | undefined,
  submitting: boolean,
): string | null {
  if (submitting) {
    return "◌";
  }

  if (!job) {
    return null;
  }

  switch (job.status) {
    case "queued":
      return "◌";
    case "processing":
      return `${job.progress}%`;
    case "completed":
      return "✓";
    case "failed":
      return "!";
    default:
      return null;
  }
}


export function AIActionButton({
  action,
  clipId,
  projectId,
  provider,
  parameters,
  preventDuplicate = true,
  queuedLabel = "Queued",
  processingLabel = "Processing",
  completedLabel = "Run again",
  failedLabel = "Retry",
  onCreated,
  onFailed,
  children,
  disabled,
  style,
  type = "button",
  ...buttonProps
}: AIActionButtonProps) {
  const {
    orderedJobs,
    createJob,
    isCreating,
  } = useAIActions();

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const matchingJob = useMemo(
    () =>
      latestMatchingJob(
        orderedJobs,
        action,
        clipId,
      ),
    [
      action,
      clipId,
      orderedJobs,
    ],
  );

  const isActive =
    matchingJob?.status === "queued" ||
    matchingJob?.status === "processing";

  const isDisabled =
    disabled ||
    isSubmitting ||
    isCreating ||
    (
      preventDuplicate &&
      isActive
    );

  const defaultLabel =
    typeof children === "string"
      ? children
      : action;

  const visibleLabel = labelForJob(
    matchingJob,
    defaultLabel,
    {
      queued: queuedLabel,
      processing: processingLabel,
      completed: completedLabel,
      failed: failedLabel,
    },
  );

  const indicator = indicatorForJob(
    matchingJob,
    isSubmitting,
  );

  async function handleClick(): Promise<void> {
    if (isDisabled) {
      return;
    }

    setIsSubmitting(true);

    const input: CreateAIActionInput = {
      action,
      clipId,
      projectId,
      provider,
      parameters,
    };

    try {
      const job = await createJob(input);
      onCreated?.(job);
    } catch (cause) {
      const error =
        cause instanceof Error
          ? cause
          : new Error(
              "Could not start AI action",
            );

      onFailed?.(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={isDisabled}
      aria-busy={
        isSubmitting || isActive
      }
      aria-label={
        buttonProps["aria-label"] ??
        `${visibleLabel} for clip ${clipId}`
      }
      style={{
        ...defaultButtonStyle,
        opacity: isDisabled ? 0.55 : 1,
        cursor:
          isDisabled
            ? "not-allowed"
            : "pointer",
        ...style,
      }}
      onClick={() => {
        void handleClick();
      }}
    >
      {indicator ? (
        <span
          style={indicatorStyle}
          aria-hidden="true"
        >
          {indicator}
        </span>
      ) : null}

      <span>
        {visibleLabel}
      </span>
    </button>
  );
}