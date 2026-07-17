import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";


export type AIActionJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "deleted";


export type AIActionEventType =
  | "connection.ready"
  | "heartbeat"
  | "ai-job.snapshot"
  | "ai-job.created"
  | "ai-job.started"
  | "ai-job.updated"
  | "ai-job.completed"
  | "ai-job.failed"
  | "ai-job.deleted";


export interface AIActionJobEvent {
  type: AIActionEventType;
  jobId?: string;
  userId?: number;
  status?: AIActionJobStatus;
  progress?: number;
  action?: string | null;
  clipId?: string | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  createdAt?: string;
  updatedAt?: string;
  scope?: "user" | "job";
}


export interface AIActionJob {
  id: string;
  status: AIActionJobStatus;
  action: string;
  clipId: string;
  progress: number;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt?: string;
  updatedAt?: string;
}


export type AIActionConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "error";


export interface UseAIActionStreamOptions {
  enabled?: boolean;
  jobId?: string;
  websocketBaseUrl?: string;
  reconnectMinDelayMs?: number;
  reconnectMaxDelayMs?: number;
  reconnectFactor?: number;
  maxReconnectAttempts?: number;
  onEvent?: (
    event: AIActionJobEvent,
  ) => void;
  onJobChange?: (
    job: AIActionJob,
  ) => void;
}


export interface UseAIActionStreamResult {
  jobs: Record<string, AIActionJob>;
  status: AIActionConnectionStatus;
  reconnectAttempts: number;
  lastEvent: AIActionJobEvent | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  removeJob: (jobId: string) => void;
  clearJobs: () => void;
}


const DEFAULT_RECONNECT_MIN_DELAY_MS = 1_000;
const DEFAULT_RECONNECT_MAX_DELAY_MS = 30_000;
const DEFAULT_RECONNECT_FACTOR = 1.8;
const DEFAULT_MAX_RECONNECT_ATTEMPTS =
  Number.POSITIVE_INFINITY;


function normalizeWebSocketBaseUrl(
  explicitBaseUrl?: string,
): string {
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }

  const configured =
    import.meta.env.VITE_API_URL as
      | string
      | undefined;

  if (configured) {
    return configured
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:")
      .replace(/\/+$/, "");
  }

  const protocol =
    window.location.protocol === "https:"
      ? "wss:"
      : "ws:";

  return `${protocol}//${window.location.host}`;
}


function buildStreamUrl(
  baseUrl: string,
  jobId?: string,
): string {
  if (jobId) {
    return (
      `${baseUrl}/api/ai/actions/` +
      `${encodeURIComponent(jobId)}/stream`
    );
  }

  return `${baseUrl}/api/ai/actions/stream`;
}


function parseEvent(
  rawData: unknown,
): AIActionJobEvent | null {
  if (typeof rawData !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(rawData);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.type !== "string"
    ) {
      return null;
    }

    return parsed as AIActionJobEvent;
  } catch {
    return null;
  }
}


function clampProgress(
  progress: number | undefined,
): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(progress ?? 0)),
  );
}


function mergeJobEvent(
  existing: AIActionJob | undefined,
  event: AIActionJobEvent,
): AIActionJob | null {
  if (!event.jobId) {
    return null;
  }

  if (event.type === "ai-job.deleted") {
    return null;
  }

  const action =
    event.action ??
    existing?.action ??
    "unknown";

  const clipId =
    event.clipId ??
    existing?.clipId ??
    "unknown";

  const status =
    event.status ??
    existing?.status ??
    "queued";

  return {
    id: event.jobId,
    status,
    action,
    clipId,
    progress: clampProgress(
      event.progress ?? existing?.progress,
    ),
    result:
      event.result !== undefined
        ? event.result
        : existing?.result ?? null,
    error:
      event.error !== undefined
        ? event.error
        : existing?.error ?? null,
    createdAt:
      event.createdAt ??
      existing?.createdAt,
    updatedAt:
      event.updatedAt ??
      event.createdAt ??
      existing?.updatedAt,
  };
}


export function useAIActionStream(
  options: UseAIActionStreamOptions = {},
): UseAIActionStreamResult {
  const {
    enabled = true,
    jobId,
    websocketBaseUrl,
    reconnectMinDelayMs =
      DEFAULT_RECONNECT_MIN_DELAY_MS,
    reconnectMaxDelayMs =
      DEFAULT_RECONNECT_MAX_DELAY_MS,
    reconnectFactor =
      DEFAULT_RECONNECT_FACTOR,
    maxReconnectAttempts =
      DEFAULT_MAX_RECONNECT_ATTEMPTS,
    onEvent,
    onJobChange,
  } = options;

  const [jobs, setJobs] = useState<
    Record<string, AIActionJob>
  >({});
  const [status, setStatus] =
    useState<AIActionConnectionStatus>("idle");
  const [reconnectAttempts, setReconnectAttempts] =
    useState(0);
  const [lastEvent, setLastEvent] =
    useState<AIActionJobEvent | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(
    null,
  );
  const reconnectTimerRef =
    useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const manuallyClosedRef = useRef(false);
  const mountedRef = useRef(false);

  const onEventRef = useRef(onEvent);
  const onJobChangeRef =
    useRef(onJobChange);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onJobChangeRef.current = onJobChange;
  }, [onJobChange]);

  const clearReconnectTimer =
    useCallback(() => {
      if (reconnectTimerRef.current === null) {
        return;
      }

      window.clearTimeout(
        reconnectTimerRef.current,
      );
      reconnectTimerRef.current = null;
    }, []);

  const closeCurrentSocket =
    useCallback(() => {
      const socket = socketRef.current;
      socketRef.current = null;

      if (
        socket &&
        socket.readyState !== WebSocket.CLOSED
      ) {
        socket.close(1000, "Client disconnect");
      }
    }, []);

  const handleJobEvent =
    useCallback((event: AIActionJobEvent) => {
      if (
        !event.jobId ||
        !event.type.startsWith("ai-job.")
      ) {
        return;
      }

      setJobs((currentJobs) => {
        const existing =
          currentJobs[event.jobId!];
        const nextJob = mergeJobEvent(
          existing,
          event,
        );

        if (!nextJob) {
          if (!(event.jobId! in currentJobs)) {
            return currentJobs;
          }

          const nextJobs = {
            ...currentJobs,
          };
          delete nextJobs[event.jobId!];
          return nextJobs;
        }

        onJobChangeRef.current?.(nextJob);

        return {
          ...currentJobs,
          [nextJob.id]: nextJob,
        };
      });
    }, []);

  const scheduleReconnectRef =
    useRef<() => void>(() => undefined);
  const connectRef =
    useRef<() => void>(() => undefined);

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) {
      return;
    }

    const existingSocket =
      socketRef.current;

    if (
      existingSocket &&
      (
        existingSocket.readyState ===
          WebSocket.CONNECTING ||
        existingSocket.readyState ===
          WebSocket.OPEN
      )
    ) {
      return;
    }

    clearReconnectTimer();
    manuallyClosedRef.current = false;

    setStatus(
      reconnectAttemptRef.current > 0
        ? "reconnecting"
        : "connecting",
    );
    setError(null);

    const baseUrl =
      normalizeWebSocketBaseUrl(
        websocketBaseUrl,
      );
    const url = buildStreamUrl(
      baseUrl,
      jobId,
    );
    const socket = new WebSocket(url);

    socketRef.current = socket;

    socket.onopen = () => {
      if (!mountedRef.current) {
        socket.close();
        return;
      }

      reconnectAttemptRef.current = 0;
      setReconnectAttempts(0);
      setStatus("connected");
      setError(null);
    };

    socket.onmessage = (message) => {
      const event = parseEvent(message.data);

      if (!event) {
        return;
      }

      setLastEvent(event);
      onEventRef.current?.(event);
      handleJobEvent(event);
    };

    socket.onerror = () => {
      if (!mountedRef.current) {
        return;
      }

      setStatus("error");
      setError(
        "WebSocket connection failed",
      );
    };

    socket.onclose = (closeEvent) => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      if (!mountedRef.current) {
        return;
      }

      if (
        manuallyClosedRef.current ||
        !enabled
      ) {
        setStatus("closed");
        return;
      }

      if (
        closeEvent.code === 4401 ||
        closeEvent.code === 4403
      ) {
        setStatus("error");
        setError(
          "WebSocket authentication failed",
        );
        return;
      }

      if (closeEvent.code === 4404) {
        setStatus("error");
        setError("AI job was not found");
        return;
      }

      scheduleReconnectRef.current();
    };
  }, [
    clearReconnectTimer,
    enabled,
    handleJobEvent,
    jobId,
    websocketBaseUrl,
  ]);

  connectRef.current = connect;

  const scheduleReconnect =
    useCallback(() => {
      if (
        manuallyClosedRef.current ||
        !enabled ||
        !mountedRef.current
      ) {
        return;
      }

      const nextAttempt =
        reconnectAttemptRef.current + 1;

      if (
        nextAttempt >
        maxReconnectAttempts
      ) {
        setStatus("error");
        setError(
          "Maximum reconnect attempts reached",
        );
        return;
      }

      reconnectAttemptRef.current =
        nextAttempt;
      setReconnectAttempts(nextAttempt);
      setStatus("reconnecting");

      const exponentialDelay =
        reconnectMinDelayMs *
        Math.pow(
          reconnectFactor,
          nextAttempt - 1,
        );

      const cappedDelay = Math.min(
        reconnectMaxDelayMs,
        exponentialDelay,
      );

      const jitter =
        0.8 + Math.random() * 0.4;
      const delay = Math.round(
        cappedDelay * jitter,
      );

      clearReconnectTimer();

      reconnectTimerRef.current =
        window.setTimeout(() => {
          reconnectTimerRef.current = null;
          connectRef.current();
        }, delay);
    }, [
      clearReconnectTimer,
      enabled,
      maxReconnectAttempts,
      reconnectFactor,
      reconnectMaxDelayMs,
      reconnectMinDelayMs,
    ]);

  scheduleReconnectRef.current =
    scheduleReconnect;

  const disconnect = useCallback(() => {
    manuallyClosedRef.current = true;
    clearReconnectTimer();
    closeCurrentSocket();
    reconnectAttemptRef.current = 0;
    setReconnectAttempts(0);
    setStatus("closed");
  }, [
    clearReconnectTimer,
    closeCurrentSocket,
  ]);

  const removeJob = useCallback(
    (targetJobId: string) => {
      setJobs((currentJobs) => {
        if (!(targetJobId in currentJobs)) {
          return currentJobs;
        }

        const nextJobs = {
          ...currentJobs,
        };
        delete nextJobs[targetJobId];
        return nextJobs;
      });
    },
    [],
  );

  const clearJobs = useCallback(() => {
    setJobs({});
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      connectRef.current();
    }

    return () => {
      mountedRef.current = false;
      manuallyClosedRef.current = true;
      clearReconnectTimer();
      closeCurrentSocket();
    };
  }, [
    enabled,
    jobId,
    websocketBaseUrl,
    clearReconnectTimer,
    closeCurrentSocket,
  ]);

  return {
    jobs,
    status,
    reconnectAttempts,
    lastEvent,
    error,
    connect,
    disconnect,
    removeJob,
    clearJobs,
  };
}