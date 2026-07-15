import { useState } from "react";
import type { GenerationQueueStatus } from "../api/generationQueueApi";
import type { Scene } from "../types/film";
import "./GenerationQueue.css";

export type QueueStatus =
  | "waiting"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

export type QueueStepType = "image" | "audio" | "video";

export interface QueueStep {
  id: string;
  sceneId: number;
  sceneTitle: string;
  type: QueueStepType;
  status: QueueStatus;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
}

interface GenerationQueueProps {
  scenes: Scene[];
  queueStatus: GenerationQueueStatus | null;
  isRunning: boolean;
  isCancelling: boolean;
  isPausing: boolean;
  queueSteps: QueueStep[];
  progressPercent?: number;
  estimatedRemainingSeconds?: number;
  currentStep?: QueueStep | null;
  onGenerateAll: () => void;
  onClearQueue: () => void;
  onCancelQueue: () => void;
  onPauseQueue: () => void;
  onResumeQueue: () => void;
  onRetryFailed: () => void;
}

function getStatusLabel(status: QueueStatus) {
  if (status === "waiting") return "Waiting";
  if (status === "running") return "Rendering";
  if (status === "done") return "Done";
  if (status === "cancelled") return "Cancelled";

  return "Failed";
}

function getStepLabel(type: QueueStepType) {
  if (type === "image") return "Image";
  if (type === "audio") return "Audio";

  return "Video";
}

function getStepIcon(type: QueueStepType) {
  if (type === "image") return "🖼️";
  if (type === "audio") return "🎙️";

  return "🎬";
}

function getQueueHeadline(status: GenerationQueueStatus | null) {
  if (status === "paused") return "Render paused";
  if (status === "pause_requested") {
    return "Pausing after current step";
  }
  if (status === "cancel_requested") return "Cancelling render";
  if (status === "completed") return "Render complete";
  if (status === "completed_with_errors") {
    return "Render completed with errors";
  }
  if (status === "cancelled") return "Render cancelled";
  if (status === "failed") return "Render failed";
  if (status === "waiting") return "Preparing render";

  return "Rendering";
}

function GenerationQueue({
  scenes,
  queueStatus,
  isRunning,
  isCancelling,
  isPausing,
  queueSteps,
  progressPercent,
  currentStep,
  onGenerateAll,
  onClearQueue,
  onCancelQueue,
  onPauseQueue,
  onResumeQueue,
  onRetryFailed,
}: GenerationQueueProps) {
  const [isOpen, setIsOpen] = useState(false);

  const completedSteps = queueSteps.filter(
    (step) => step.status === "done"
  ).length;

  const failedSteps = queueSteps.filter(
    (step) => step.status === "failed"
  ).length;

  const cancelledSteps = queueSteps.filter(
    (step) => step.status === "cancelled"
  ).length;

  const totalSteps = queueSteps.length;

  const calculatedProgress =
    totalSteps > 0
      ? Math.round((completedSteps / totalSteps) * 100)
      : 0;

  const progress = Math.min(
    Math.max(progressPercent ?? calculatedProgress, 0),
    100
  );

  const isPaused = queueStatus === "paused";
  const isPauseRequested = queueStatus === "pause_requested";
  const isCancelRequested = queueStatus === "cancel_requested";
  const hasQueue = totalSteps > 0;

  const activeStep =
    currentStep ??
    queueSteps.find((step) => step.status === "running") ??
    null;

  const canRetry =
    !isRunning &&
    !isPaused &&
    failedSteps > 0;

  const showProgressSpinner =
    hasQueue &&
    !isPaused &&
    progress < 100 &&
    (isRunning ||
      isPausing ||
      isCancelling ||
      isPauseRequested ||
      isCancelRequested ||
      queueStatus === "waiting");

  return (
    <section className="render-queue card card-dark mb-5">
      <div className="render-queue__header">
        <div className="render-queue__title-group">
          <span className="render-queue__eyebrow">
            Render Queue
          </span>

          <h2>
            {hasQueue
              ? getQueueHeadline(queueStatus)
              : "Generate all media"}
          </h2>

          <p>
            {hasQueue
              ? `${completedSteps} of ${totalSteps} steps complete`
              : "Generate missing images, audio and videos for every scene."}
          </p>
        </div>

        <div className="render-queue__actions">
          {isPaused ? (
            <button
              className="btn btn-outline-info"
              type="button"
              onClick={onResumeQueue}
            >
              Resume
            </button>
          ) : (
            <button
              className="btn btn-outline-info"
              type="button"
              onClick={onPauseQueue}
              disabled={
                !isRunning ||
                isPausing ||
                isPauseRequested
              }
            >
              {isPausing || isPauseRequested
                ? "Pausing..."
                : "Pause"}
            </button>
          )}

          <button
            className="btn btn-outline-warning"
            type="button"
            onClick={onCancelQueue}
            disabled={
              (!isRunning && !isPaused) ||
              isCancelling
            }
          >
            {isCancelling
              ? "Cancelling..."
              : "Cancel"}
          </button>

          <button
            className="btn btn-outline-info"
            type="button"
            onClick={onRetryFailed}
            disabled={!canRetry}
          >
            Retry
          </button>

          <button
            className="btn btn-gradient"
            type="button"
            onClick={onGenerateAll}
            disabled={
              isRunning ||
              isPaused ||
              scenes.length === 0
            }
          >
            {isRunning
              ? "Rendering..."
              : "Generate All"}
          </button>
        </div>
      </div>

      {hasQueue && (
        <div className="render-queue__summary">
          <div className="render-queue__progress-row">
            <div className="render-queue__progress-value">
              <strong>{progress}%</strong>

              {showProgressSpinner && (
                <span
                  className="render-queue__progress-spinner"
                  role="status"
                  aria-label="Rendering in progress"
                />
              )}
            </div>

            <button
              type="button"
              className="render-queue__details-toggle"
              onClick={() =>
                setIsOpen((current) => !current)
              }
              aria-expanded={isOpen}
            >
              {isOpen
                ? "Hide details"
                : "Show details"}
            </button>
          </div>

          <div
            className="render-queue__progress-track"
            role="progressbar"
            aria-label="Render progress"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="render-queue__progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="render-queue__current-step">
            <span className="render-queue__current-icon">
              {activeStep
                ? getStepIcon(activeStep.type)
                : isPaused
                  ? "⏸️"
                  : "✓"}
            </span>

            <div>
              <strong>
                {activeStep
                  ? `${getStepLabel(activeStep.type)} · ${activeStep.sceneTitle}`
                  : isPaused
                    ? "Queue is paused"
                    : queueStatus === "completed"
                      ? "All render steps completed"
                      : "Waiting for the next step"}
              </strong>

              <span>
                {activeStep
                  ? `Scene ${activeStep.sceneId}`
                  : `${failedSteps} failed · ${cancelledSteps} cancelled`}
              </span>
            </div>
          </div>
        </div>
      )}

      {!hasQueue && (
        <div className="render-queue__empty">
          <span>🎞️</span>

          <div>
            <strong>Queue is empty</strong>

            <p>
              Click Generate All when your storyboard is ready.
            </p>
          </div>
        </div>
      )}

      {isOpen && hasQueue && (
        <div className="render-queue__details">
          {queueSteps.map((step) => (
            <div
              key={step.id}
              className={`render-queue__step render-queue__step--${step.status}`}
            >
              <span className="render-queue__step-icon">
                {getStepIcon(step.type)}
              </span>

              <div className="render-queue__step-copy">
                <strong>
                  {getStepLabel(step.type)} ·{" "}
                  {step.sceneTitle}
                </strong>

                <span>
                  {step.error ??
                    `Scene ${step.sceneId}`}
                </span>
              </div>

              <span className="render-queue__step-status">
                {getStatusLabel(step.status)}
              </span>
            </div>
          ))}

          <div className="render-queue__footer">
            <button
              className="btn btn-sm btn-outline-danger"
              type="button"
              onClick={onClearQueue}
              disabled={isRunning || isPaused}
            >
              Clear queue
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default GenerationQueue;