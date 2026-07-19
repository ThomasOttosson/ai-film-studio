import React from "react";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  getAIActionJob,
  type AIActionJob,
} from "../services/aiActions";
import { useAIActionQueue } from "../providers/AIActionQueueProvider";

export interface AIJobQueuePanelProps {
  className?: string;
  collapsedByDefault?: boolean;
  pollingIntervalMs?: number;
  onApplyResult?: (job: AIActionJob) => void;
}

const ACTION_LABELS: Record<string, string> = {
  "extend-scene": "Förläng scen",
  "cinematic-motion": "Cinematic motion",
  "remove-background": "Ta bort bakgrund",
  "change-style": "Ändra stil",
  "enhance-quality": "Förbättra kvalitet",
  "generate-voiceover": "Generera voice-over",
  "clean-audio": "Rensa ljud",
  "rewrite-narration": "Skriv om narration",
};

const STATUS_LABELS: Record<AIActionJob["status"], string> = {
  queued: "I kö",
  processing: "Bearbetas",
  completed: "Klar",
  failed: "Misslyckades",
};

function normalizeProgress(job: AIActionJob): number {
  if (job.status === "completed") {
    return 100;
  }

  if (job.status === "failed") {
    return 100;
  }

  if (typeof job.progress !== "number") {
    return job.status === "processing" ? 20 : 5;
  }

  const rawProgress =
    job.progress <= 1 ? job.progress * 100 : job.progress;

  return Math.min(100, Math.max(0, Math.round(rawProgress)));
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getResultPreview(job: AIActionJob): string | null {
  if (!job.result) {
    return null;
  }

  const result = job.result;

  const textCandidates = [
    result.message,
    result.text,
    result.narration,
    result.prompt,
    result.url,
    result.media_url,
    result.video_url,
    result.audio_url,
    result.image_url,
  ];

  const preview = textCandidates.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  return preview?.trim() ?? null;
}

export default function AIJobQueuePanel({
  className = "",
  collapsedByDefault = false,
  pollingIntervalMs = 1800,
  onApplyResult,
}: AIJobQueuePanelProps): React.ReactElement {
  const {
    jobs,
    latestError,
    clearError,
    removeJob,
    clearJobs,
  } = useAIActionQueue();

  const [collapsed, setCollapsed] = useState(
    collapsedByDefault,
  );
  const [expandedJobIds, setExpandedJobIds] = useState<
    Set<string>
  >(() => new Set());

  const activeJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.status === "queued" ||
          job.status === "processing",
      ),
    [jobs],
  );

  useEffect(() => {
    if (activeJobs.length === 0) {
      return;
    }

    let cancelled = false;
    const controllers = new Map<string, AbortController>();

    const refreshJobs = async () => {
      await Promise.all(
        activeJobs.map(async (job) => {
          const controller = new AbortController();
          controllers.set(job.id, controller);

          try {
            const updatedJob = await getAIActionJob(
              job.id,
              controller.signal,
            );

            if (cancelled) {
              return;
            }

            window.dispatchEvent(
              new CustomEvent(
                "ai-film-studio:ai-job-updated",
                {
                  detail: updatedJob,
                },
              ),
            );
          } catch (error) {
            if (
              error instanceof DOMException &&
              error.name === "AbortError"
            ) {
              return;
            }

            if (!cancelled) {
              window.dispatchEvent(
                new CustomEvent(
                  "ai-film-studio:ai-job-error",
                  {
                    detail: {
                      action: job.action,
                      clipId: job.clipId,
                      error:
                        error instanceof Error
                          ? error.message
                          : "Kunde inte uppdatera AI-jobbet.",
                    },
                  },
                ),
              );
            }
          } finally {
            controllers.delete(job.id);
          }
        }),
      );
    };

    void refreshJobs();

    const intervalId = window.setInterval(
      refreshJobs,
      Math.max(750, pollingIntervalMs),
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      controllers.forEach((controller) =>
        controller.abort(),
      );
      controllers.clear();
    };
  }, [activeJobs, pollingIntervalMs]);

  const toggleExpanded = (jobId: string) => {
    setExpandedJobIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(jobId)) {
        nextIds.delete(jobId);
      } else {
        nextIds.add(jobId);
      }

      return nextIds;
    });
  };

  const rootStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: 14,
    background:
      "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98))",
    color: "#e2e8f0",
    boxShadow: "0 18px 45px rgba(2, 6, 23, 0.35)",
  };

  const buttonStyle: CSSProperties = {
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: 8,
    background: "rgba(30, 41, 59, 0.8)",
    color: "#e2e8f0",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  };

  return (
    <section
      className={`ai-job-queue-panel ${className}`.trim()}
      style={rootStyle}
      aria-label="AI-jobbkö"
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 14px",
          borderBottom: collapsed
            ? "none"
            : "1px solid rgba(148, 163, 184, 0.14)",
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          style={{
            ...buttonStyle,
            display: "flex",
            alignItems: "center",
            gap: 9,
            flex: 1,
            justifyContent: "flex-start",
            border: "none",
            background: "transparent",
            padding: 0,
            textAlign: "left",
          }}
          aria-expanded={!collapsed}
        >
          <span aria-hidden="true">
            {collapsed ? "▸" : "▾"}
          </span>

          <span>AI-jobb</span>

          <span
            style={{
              minWidth: 24,
              padding: "2px 7px",
              borderRadius: 999,
              background:
                activeJobs.length > 0
                  ? "rgba(59, 130, 246, 0.2)"
                  : "rgba(148, 163, 184, 0.14)",
              color:
                activeJobs.length > 0
                  ? "#93c5fd"
                  : "#94a3b8",
              textAlign: "center",
              fontSize: 11,
            }}
          >
            {jobs.length}
          </span>
        </button>

        {!collapsed && jobs.length > 0 && (
          <button
            type="button"
            onClick={clearJobs}
            style={buttonStyle}
          >
            Rensa alla
          </button>
        )}
      </header>

      {!collapsed && (
        <>
          {latestError && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
                margin: "12px 12px 0",
                padding: 11,
                border:
                  "1px solid rgba(248, 113, 113, 0.35)",
                borderRadius: 10,
                background: "rgba(127, 29, 29, 0.24)",
                color: "#fecaca",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              <span>{latestError}</span>

              <button
                type="button"
                onClick={clearError}
                aria-label="Stäng felmeddelandet"
                style={{
                  ...buttonStyle,
                  padding: "2px 6px",
                  border: "none",
                  background: "transparent",
                  color: "#fecaca",
                }}
              >
                ×
              </button>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: 12,
              maxHeight: 390,
              overflowY: "auto",
            }}
          >
            {jobs.length === 0 ? (
              <div
                style={{
                  padding: "26px 14px",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                Inga AI-jobb har startats ännu.
              </div>
            ) : (
              jobs.map((job) => {
                const progress = normalizeProgress(job);
                const expanded =
                  expandedJobIds.has(job.id);
                const resultPreview = getResultPreview(job);
                const timestamp = formatTimestamp(
                  job.updatedAt ?? job.createdAt,
                );

                return (
                  <article
                    key={job.id}
                    style={{
                      overflow: "hidden",
                      border:
                        "1px solid rgba(148, 163, 184, 0.16)",
                      borderRadius: 11,
                      background: "rgba(15, 23, 42, 0.72)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(job.id)}
                      aria-expanded={expanded}
                      style={{
                        display: "flex",
                        width: "100%",
                        alignItems: "center",
                        gap: 10,
                        border: "none",
                        background: "transparent",
                        color: "inherit",
                        padding: 12,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: 15,
                          color:
                            job.status === "completed"
                              ? "#4ade80"
                              : job.status === "failed"
                                ? "#f87171"
                                : "#60a5fa",
                        }}
                      >
                        {job.status === "completed"
                          ? "✓"
                          : job.status === "failed"
                            ? "!"
                            : job.status === "processing"
                              ? "◌"
                              : "•"}
                      </span>

                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                        >
                          {ACTION_LABELS[job.action] ??
                            job.action}
                        </strong>

                        <span
                          style={{
                            color: "#94a3b8",
                            fontSize: 11,
                          }}
                        >
                          {STATUS_LABELS[job.status]}
                          {timestamp ? ` · ${timestamp}` : ""}
                        </span>
                      </span>

                      <span
                        style={{
                          color: "#94a3b8",
                          fontSize: 11,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {progress}%
                      </span>

                      <span
                        aria-hidden="true"
                        style={{ color: "#64748b" }}
                      >
                        {expanded ? "▾" : "▸"}
                      </span>
                    </button>

                    <div
                      aria-hidden="true"
                      style={{
                        height: 3,
                        background: "rgba(51, 65, 85, 0.75)",
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: "100%",
                          background:
                            job.status === "completed"
                              ? "#22c55e"
                              : job.status === "failed"
                                ? "#ef4444"
                                : "#3b82f6",
                          transition: "width 250ms ease",
                        }}
                      />
                    </div>

                    {expanded && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          padding: 12,
                          borderTop:
                            "1px solid rgba(148, 163, 184, 0.1)",
                          fontSize: 12,
                        }}
                      >
                        <dl
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(70px, auto) minmax(0, 1fr)",
                            gap: "6px 10px",
                            margin: 0,
                          }}
                        >
                          <dt style={{ color: "#64748b" }}>
                            Klipp
                          </dt>
                          <dd
                            style={{
                              margin: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {job.clipId}
                          </dd>

                          <dt style={{ color: "#64748b" }}>
                            Jobb-ID
                          </dt>
                          <dd
                            style={{
                              margin: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {job.id}
                          </dd>
                        </dl>

                        {job.error && (
                          <div
                            style={{
                              padding: 9,
                              borderRadius: 8,
                              background:
                                "rgba(127, 29, 29, 0.24)",
                              color: "#fecaca",
                              lineHeight: 1.45,
                            }}
                          >
                            {job.error}
                          </div>
                        )}

                        {resultPreview && (
                          <div
                            style={{
                              padding: 9,
                              borderRadius: 8,
                              background:
                                "rgba(30, 41, 59, 0.78)",
                              color: "#cbd5e1",
                              lineHeight: 1.45,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {resultPreview}
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {job.status === "completed" &&
                            onApplyResult && (
                              <button
                                type="button"
                                onClick={() =>
                                  onApplyResult(job)
                                }
                                style={{
                                  ...buttonStyle,
                                  borderColor:
                                    "rgba(74, 222, 128, 0.35)",
                                  background:
                                    "rgba(20, 83, 45, 0.38)",
                                  color: "#bbf7d0",
                                }}
                              >
                                Använd resultat
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={() => removeJob(job.id)}
                            style={buttonStyle}
                          >
                            Ta bort
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}