import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  type AIActionJob,
} from "./useAIActionStream";
import {
  useAIActions,
} from "../providers/AIActionProvider";


export interface AIActionResultContext {
  job: AIActionJob;
  result: Record<string, unknown>;
}


export interface UseAIActionResultsOptions {
  enabled?: boolean;
  clipId?: string;
  action?: string;
  consumeExisting?: boolean;
  markFailedAsHandled?: boolean;
  onResult: (
    context: AIActionResultContext,
  ) => void | Promise<void>;
  onApplyError?: (
    error: Error,
    job: AIActionJob,
  ) => void;
  onJobFailed?: (
    job: AIActionJob,
  ) => void;
}


export interface UseAIActionResultsResult {
  pendingResults: AIActionJob[];
  handledJobIds: ReadonlySet<string>;
  applyJobResult: (
    jobId: string,
  ) => Promise<boolean>;
  markHandled: (
    jobId: string,
  ) => void;
  resetHandled: (
    jobId?: string,
  ) => void;
}


function matchesFilters(
  job: AIActionJob,
  clipId?: string,
  action?: string,
): boolean {
  if (
    clipId !== undefined &&
    job.clipId !== clipId
  ) {
    return false;
  }

  if (
    action !== undefined &&
    job.action !== action
  ) {
    return false;
  }

  return true;
}


function toError(
  cause: unknown,
  fallback: string,
): Error {
  if (cause instanceof Error) {
    return cause;
  }

  return new Error(fallback);
}


export function useAIActionResults({
  enabled = true,
  clipId,
  action,
  consumeExisting = false,
  markFailedAsHandled = true,
  onResult,
  onApplyError,
  onJobFailed,
}: UseAIActionResultsOptions):
  UseAIActionResultsResult {
  const {
    jobs,
    orderedJobs,
  } = useAIActions();

  const handledJobIdsRef =
    useRef<Set<string>>(new Set());
  const applyingJobIdsRef =
    useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const onResultRef = useRef(onResult);
  const onApplyErrorRef =
    useRef(onApplyError);
  const onJobFailedRef =
    useRef(onJobFailed);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onApplyErrorRef.current =
      onApplyError;
  }, [onApplyError]);

  useEffect(() => {
    onJobFailedRef.current =
      onJobFailed;
  }, [onJobFailed]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    if (consumeExisting) {
      return;
    }

    for (const job of orderedJobs) {
      if (
        job.status === "completed" ||
        job.status === "failed"
      ) {
        handledJobIdsRef.current.add(
          job.id,
        );
      }
    }
  }, [
    consumeExisting,
    orderedJobs,
  ]);

  const pendingResults = useMemo(
    () =>
      orderedJobs.filter(
        (job) =>
          job.status === "completed" &&
          job.result !== null &&
          matchesFilters(
            job,
            clipId,
            action,
          ) &&
          !handledJobIdsRef.current.has(
            job.id,
          ),
      ),
    [
      action,
      clipId,
      orderedJobs,
    ],
  );

  const markHandled = useCallback(
    (jobId: string) => {
      handledJobIdsRef.current.add(jobId);
      applyingJobIdsRef.current.delete(
        jobId,
      );
    },
    [],
  );

  const resetHandled = useCallback(
    (jobId?: string) => {
      if (jobId) {
        handledJobIdsRef.current.delete(
          jobId,
        );
        applyingJobIdsRef.current.delete(
          jobId,
        );
        return;
      }

      handledJobIdsRef.current.clear();
      applyingJobIdsRef.current.clear();
    },
    [],
  );

  const applyJobResult = useCallback(
    async (
      jobId: string,
    ): Promise<boolean> => {
      const job = jobs[jobId];

      if (
        !job ||
        job.status !== "completed" ||
        job.result === null ||
        !matchesFilters(
          job,
          clipId,
          action,
        ) ||
        handledJobIdsRef.current.has(
          jobId,
        ) ||
        applyingJobIdsRef.current.has(
          jobId,
        )
      ) {
        return false;
      }

      applyingJobIdsRef.current.add(jobId);

      try {
        await onResultRef.current({
          job,
          result: job.result,
        });

        handledJobIdsRef.current.add(jobId);
        return true;
      } catch (cause) {
        const error = toError(
          cause,
          `Could not apply result for AI job ${jobId}`,
        );

        onApplyErrorRef.current?.(
          error,
          job,
        );

        return false;
      } finally {
        applyingJobIdsRef.current.delete(
          jobId,
        );
      }
    },
    [
      action,
      clipId,
      jobs,
    ],
  );

  useEffect(() => {
    if (
      !enabled ||
      !initializedRef.current
    ) {
      return;
    }

    for (const job of orderedJobs) {
      if (
        !matchesFilters(
          job,
          clipId,
          action,
        ) ||
        handledJobIdsRef.current.has(
          job.id,
        )
      ) {
        continue;
      }

      if (job.status === "failed") {
        onJobFailedRef.current?.(job);

        if (markFailedAsHandled) {
          handledJobIdsRef.current.add(
            job.id,
          );
        }

        continue;
      }

      if (
        job.status === "completed" &&
        job.result !== null
      ) {
        void applyJobResult(job.id);
      }
    }
  }, [
    action,
    applyJobResult,
    clipId,
    enabled,
    markFailedAsHandled,
    orderedJobs,
  ]);

  return {
    pendingResults,
    handledJobIds:
      handledJobIdsRef.current,
    applyJobResult,
    markHandled,
    resetHandled,
  };
}