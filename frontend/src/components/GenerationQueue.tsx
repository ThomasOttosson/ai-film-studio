import { useState } from "react";
import type { Scene } from "../types/film";

type QueueStatus = "waiting" | "running" | "done" | "failed" | "cancelled";

type QueueStepType = "image" | "audio" | "video";

export interface QueueStep {
  id: string;
  sceneId: number;
  sceneTitle: string;
  type: QueueStepType;
  status: QueueStatus;
  error?: string;
}

interface GenerationQueueProps {
  scenes: Scene[];
  isRunning: boolean;
  isCancelling: boolean;
  queueSteps: QueueStep[];
  onGenerateAll: () => void;
  onClearQueue: () => void;
  onCancelQueue: () => void;
}

function getStatusLabel(status: QueueStatus) {
  if (status === "waiting") return "Waiting";
  if (status === "running") return "Generating";
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

function GenerationQueue({
  scenes,
  isRunning,
  isCancelling,
  queueSteps,
  onGenerateAll,
  onClearQueue,
  onCancelQueue,
}: GenerationQueueProps) {
  const [isOpen, setIsOpen] = useState(true);

  const completedSteps = queueSteps.filter(
    (step) => step.status === "done"
  ).length;
  const failedSteps = queueSteps.filter(
    (step) => step.status === "failed"
  ).length;
  const cancelledSteps = queueSteps.filter(
    (step) => step.status === "cancelled"
  ).length;

  const progress =
    queueSteps.length > 0
      ? Math.round((completedSteps / queueSteps.length) * 100)
      : 0;

  return (
    <section className="card card-dark p-4 mb-5">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <span className="text-uppercase small fw-bold text-info">
            Generation Queue
          </span>
          <h2 className="h4 fw-bold mt-2 mb-2">Generate All Media</h2>
          <p className="muted-text mb-0">
            Automatically generate missing images, audio and videos for every
            scene in the current project.
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap justify-content-end">
          <button
            className="btn btn-outline-light"
            type="button"
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? "Hide Queue" : "Show Queue"}
          </button>

          <button
            className="btn btn-outline-warning"
            type="button"
            onClick={onCancelQueue}
            disabled={!isRunning || isCancelling}
          >
            {isCancelling ? "Cancelling..." : "Cancel Generation"}
          </button>

          <button
            className="btn btn-outline-danger"
            type="button"
            onClick={onClearQueue}
            disabled={isRunning || queueSteps.length === 0}
          >
            Clear
          </button>

          <button
            className="btn btn-gradient"
            type="button"
            onClick={onGenerateAll}
            disabled={isRunning || scenes.length === 0}
          >
            {isRunning ? "Generating..." : "Generate All"}
          </button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="p-3 rounded border bg-dark h-100">
            <p className="muted-text small mb-1">Scenes</p>
            <h3 className="h5 fw-bold mb-0">{scenes.length}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="p-3 rounded border bg-dark h-100">
            <p className="muted-text small mb-1">Steps</p>
            <h3 className="h5 fw-bold mb-0">{queueSteps.length}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="p-3 rounded border bg-dark h-100">
            <p className="muted-text small mb-1">Completed</p>
            <h3 className="h5 fw-bold mb-0">{completedSteps}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="p-3 rounded border bg-dark h-100">
            <p className="muted-text small mb-1">Failed / Cancelled</p>
            <h3 className="h5 fw-bold mb-0">
              {failedSteps}/{cancelledSteps}
            </h3>
          </div>
        </div>
      </div>

      {queueSteps.length > 0 && (
        <div className="mb-3">
          <div className="d-flex justify-content-between small muted-text mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>

          <div
            className="progress bg-dark border"
            style={{ height: 10, borderRadius: 999 }}
          >
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${progress}%`,
                borderRadius: 999,
              }}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {isOpen && (
        <>
          {queueSteps.length === 0 ? (
            <div className="p-4 rounded border bg-dark text-center">
              <h3 className="h5 fw-bold mb-2">Queue is empty</h3>
              <p className="muted-text mb-0">
                Click Generate All to create images, audio and videos for your
                scenes.
              </p>
            </div>
          ) : (
            <div className="d-grid gap-2">
              {queueSteps.map((step) => (
                <div
                  key={step.id}
                  className="d-flex justify-content-between align-items-center gap-3 rounded border bg-dark p-3"
                >
                  <div className="d-flex align-items-center gap-3">
                    <span style={{ fontSize: "1.35rem" }}>
                      {getStepIcon(step.type)}
                    </span>

                    <div>
                      <h3 className="h6 fw-bold mb-1">
                        {getStepLabel(step.type)} · {step.sceneTitle}
                      </h3>

                      {step.error ? (
                        <p className="text-danger small mb-0">{step.error}</p>
                      ) : (
                        <p className="muted-text small mb-0">
                          Scene ID: {step.sceneId}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`badge ${
                      step.status === "done"
                        ? "text-bg-success"
                        : step.status === "failed"
                          ? "text-bg-danger"
                          : step.status === "running"
                            ? "text-bg-info"
                            : step.status === "cancelled"
                              ? "text-bg-warning"
                              : "text-bg-secondary"
                    }`}
                  >
                    {getStatusLabel(step.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default GenerationQueue;