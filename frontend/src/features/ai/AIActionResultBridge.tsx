import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  type AIActionJob,
} from "../hooks/useAIActionStream";
import {
  useAIActionResults,
} from "../hooks/useAIActionResults";


export interface AIActionResultBridgeProps {
  enabled?: boolean;
  clipId?: string;
  action?: string;
  consumeExisting?: boolean;
  markFailedAsHandled?: boolean;
  children?: ReactNode;
  applyResult: (
    result: Record<string, unknown>,
    job: AIActionJob,
  ) => void | Promise<void>;
  onApplied?: (
    job: AIActionJob,
  ) => void;
  onApplyError?: (
    error: Error,
    job: AIActionJob,
  ) => void;
  onJobFailed?: (
    job: AIActionJob,
  ) => void;
}


export function AIActionResultBridge({
  enabled = true,
  clipId,
  action,
  consumeExisting = false,
  markFailedAsHandled = true,
  children = null,
  applyResult,
  onApplied,
  onApplyError,
  onJobFailed,
}: AIActionResultBridgeProps) {
  const mountedRef = useRef(true);
  const applyResultRef =
    useRef(applyResult);
  const onAppliedRef =
    useRef(onApplied);
  const onApplyErrorRef =
    useRef(onApplyError);
  const onJobFailedRef =
    useRef(onJobFailed);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    applyResultRef.current =
      applyResult;
  }, [applyResult]);

  useEffect(() => {
    onAppliedRef.current =
      onApplied;
  }, [onApplied]);

  useEffect(() => {
    onApplyErrorRef.current =
      onApplyError;
  }, [onApplyError]);

  useEffect(() => {
    onJobFailedRef.current =
      onJobFailed;
  }, [onJobFailed]);

  const handleResult = useCallback(
    async ({
      job,
      result,
    }: {
      job: AIActionJob;
      result: Record<string, unknown>;
    }) => {
      await applyResultRef.current(
        result,
        job,
      );

      if (mountedRef.current) {
        onAppliedRef.current?.(job);
      }
    },
    [],
  );

  const handleApplyError = useCallback(
    (
      error: Error,
      job: AIActionJob,
    ) => {
      if (!mountedRef.current) {
        return;
      }

      onApplyErrorRef.current?.(
        error,
        job,
      );
    },
    [],
  );

  const handleJobFailed = useCallback(
    (job: AIActionJob) => {
      if (!mountedRef.current) {
        return;
      }

      onJobFailedRef.current?.(job);
    },
    [],
  );

  useAIActionResults({
    enabled,
    clipId,
    action,
    consumeExisting,
    markFailedAsHandled,
    onResult: handleResult,
    onApplyError: handleApplyError,
    onJobFailed: handleJobFailed,
  });

  return <>{children}</>;
}
