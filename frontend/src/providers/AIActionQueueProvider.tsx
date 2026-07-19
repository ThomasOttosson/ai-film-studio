import React from "react";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AI_ACTION_EVENT,
  registerAIActionQueueListener,
  type AIActionJob,
} from "../services/aiActions";

export interface AIActionQueueContextValue {
  jobs: AIActionJob[];
  latestJob: AIActionJob | null;
  latestError: string | null;
  clearError: () => void;
  removeJob: (jobId: string) => void;
  clearJobs: () => void;
}

const AIActionQueueContext =
  createContext<AIActionQueueContextValue | null>(null);

interface AIJobQueuedEvent extends CustomEvent<AIActionJob> {}

interface AIJobErrorDetail {
  action?: string;
  clipId?: string;
  error?: string;
}

interface AIJobErrorEvent extends CustomEvent<AIJobErrorDetail> {}

function upsertJob(
  currentJobs: AIActionJob[],
  incomingJob: AIActionJob,
): AIActionJob[] {
  const existingIndex = currentJobs.findIndex(
    (job) => job.id === incomingJob.id,
  );

  if (existingIndex === -1) {
    return [incomingJob, ...currentJobs];
  }

  return currentJobs.map((job, index) =>
    index === existingIndex
      ? {
          ...job,
          ...incomingJob,
        }
      : job,
  );
}

export function AIActionQueueProvider({
  children,
}: PropsWithChildren): React.ReactElement {
  const [jobs, setJobs] = useState<AIActionJob[]>([]);
  const [latestError, setLatestError] = useState<string | null>(null);

  useEffect(() => {
    const unregisterQueueListener =
      registerAIActionQueueListener();

    const handleQueuedJob = (event: Event) => {
      const customEvent = event as AIJobQueuedEvent;

      if (!customEvent.detail?.id) {
        return;
      }

      setLatestError(null);
      setJobs((currentJobs) =>
        upsertJob(currentJobs, customEvent.detail),
      );
    };

    const handleJobUpdate = (event: Event) => {
      const customEvent = event as AIJobQueuedEvent;

      if (!customEvent.detail?.id) {
        return;
      }

      setJobs((currentJobs) =>
        upsertJob(currentJobs, customEvent.detail),
      );
    };

    const handleJobError = (event: Event) => {
      const customEvent = event as AIJobErrorEvent;

      setLatestError(
        customEvent.detail?.error ||
          "AI-jobbet kunde inte startas.",
      );
    };

    window.addEventListener(
      "ai-film-studio:ai-job-queued",
      handleQueuedJob,
    );
    window.addEventListener(
      "ai-film-studio:ai-job-updated",
      handleJobUpdate,
    );
    window.addEventListener(
      "ai-film-studio:ai-job-error",
      handleJobError,
    );

    return () => {
      unregisterQueueListener();

      window.removeEventListener(
        "ai-film-studio:ai-job-queued",
        handleQueuedJob,
      );
      window.removeEventListener(
        "ai-film-studio:ai-job-updated",
        handleJobUpdate,
      );
      window.removeEventListener(
        "ai-film-studio:ai-job-error",
        handleJobError,
      );
    };
  }, []);

  const value = useMemo<AIActionQueueContextValue>(
    () => ({
      jobs,
      latestJob: jobs[0] ?? null,
      latestError,
      clearError: () => {
        setLatestError(null);
      },
      removeJob: (jobId: string) => {
        setJobs((currentJobs) =>
          currentJobs.filter((job) => job.id !== jobId),
        );
      },
      clearJobs: () => {
        setJobs([]);
      },
    }),
    [jobs, latestError],
  );

  return (
    <AIActionQueueContext.Provider value={value}>
      {children}
    </AIActionQueueContext.Provider>
  );
}

export function useAIActionQueue(): AIActionQueueContextValue {
  const context = useContext(AIActionQueueContext);

  if (!context) {
    throw new Error(
      "useAIActionQueue måste användas inuti AIActionQueueProvider.",
    );
  }

  return context;
}

export function isAIActionQueueRegistered(): boolean {
  return typeof window !== "undefined" && AI_ACTION_EVENT in window;
}

export default AIActionQueueProvider;