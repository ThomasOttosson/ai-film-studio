import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  type AIActionJob,
  type AIActionJobStatus,
  useAIActionStream,
} from "../hooks/useAIActionStream";


export interface CreateAIActionInput {
  action: string;
  clipId: string;
  projectId?: string;
  provider?: string;
  parameters?: Record<string, unknown>;
}


export interface AIActionJobResponse {
  id: string;
  userId?: number;
  action: string;
  clipId: string;
  projectId?: string | null;
  provider?: string | null;
  parameters?: Record<string, unknown>;
  status: AIActionJobStatus;
  progress: number;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt?: string;
  updatedAt?: string;
}


export interface AIActionContextValue {
  jobs: Record<string, AIActionJob>;
  orderedJobs: AIActionJob[];
  activeJobs: AIActionJob[];
  isLoading: boolean;
  isCreating: boolean;
  streamStatus:
    | "idle"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "closed"
    | "error";
  streamError: string | null;
  requestError: string | null;
  createJob: (
    input: CreateAIActionInput,
  ) => Promise<AIActionJob>;
  refreshJobs: (
    filters?: {
      projectId?: string;
      clipId?: string;
      limit?: number;
    },
  ) => Promise<AIActionJob[]>;
  refreshJob: (
    jobId: string,
  ) => Promise<AIActionJob>;
  deleteJob: (
    jobId: string,
  ) => Promise<void>;
  getJob: (
    jobId: string,
  ) => AIActionJob | undefined;
  clearRequestError: () => void;
}


export interface AIActionProviderProps
  extends PropsWithChildren {
  apiBaseUrl?: string;
  websocketBaseUrl?: string;
  autoConnect?: boolean;
}


const AIActionContext =
  createContext<AIActionContextValue | null>(
    null,
  );


function normalizeApiBaseUrl(
  explicitBaseUrl?: string,
): string {
  const configured =
    explicitBaseUrl ??
    (
      import.meta.env.VITE_API_URL as
        | string
        | undefined
    ) ??
    "";

  return configured.replace(/\/+$/, "");
}


function apiUrl(
  baseUrl: string,
  path: string,
): string {
  return `${baseUrl}${path}`;
}


function normalizeJob(
  payload: AIActionJobResponse,
): AIActionJob {
  return {
    id: payload.id,
    action: payload.action,
    clipId: payload.clipId,
    status: payload.status,
    progress: Math.min(
      100,
      Math.max(
        0,
        Math.round(payload.progress ?? 0),
      ),
    ),
    result: payload.result ?? null,
    error: payload.error ?? null,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
}


function extractErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (
    typeof payload === "object" &&
    payload !== null
  ) {
    const detail = (
      payload as {
        detail?: unknown;
        message?: unknown;
      }
    ).detail;

    if (typeof detail === "string") {
      return detail;
    }

    const message = (
      payload as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}


async function readResponsePayload(
  response: Response,
): Promise<unknown> {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    return response.json();
  }

  const text = await response.text();

  return text || null;
}


async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body
        ? {
            "Content-Type":
              "application/json",
          }
        : {}),
      ...init?.headers,
    },
  });

  const payload =
    await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(
        payload,
        `Request failed with status ${response.status}`,
      ),
    );
  }

  return payload as T;
}


export function AIActionProvider({
  children,
  apiBaseUrl,
  websocketBaseUrl,
  autoConnect = true,
}: AIActionProviderProps) {
  const normalizedApiBaseUrl =
    useMemo(
      () =>
        normalizeApiBaseUrl(apiBaseUrl),
      [apiBaseUrl],
    );

  const [restJobs, setRestJobs] = useState<
    Record<string, AIActionJob>
  >({});
  const [isLoading, setIsLoading] =
    useState(false);
  const [isCreating, setIsCreating] =
    useState(false);
  const [requestError, setRequestError] =
    useState<string | null>(null);

  const stream = useAIActionStream({
    enabled: autoConnect,
    websocketBaseUrl,
    onJobChange: (job) => {
      setRestJobs((current) => ({
        ...current,
        [job.id]: {
          ...current[job.id],
          ...job,
        },
      }));
    },
  });

  const jobs = useMemo(
    () => ({
      ...restJobs,
      ...stream.jobs,
    }),
    [restJobs, stream.jobs],
  );

  const orderedJobs = useMemo(
    () =>
      Object.values(jobs).sort(
        (left, right) => {
          const leftTime = Date.parse(
            left.updatedAt ??
              left.createdAt ??
              "",
          );
          const rightTime = Date.parse(
            right.updatedAt ??
              right.createdAt ??
              "",
          );

          return rightTime - leftTime;
        },
      ),
    [jobs],
  );

  const activeJobs = useMemo(
    () =>
      orderedJobs.filter(
        (job) =>
          job.status === "queued" ||
          job.status === "processing",
      ),
    [orderedJobs],
  );

  const createJob = useCallback(
    async (
      input: CreateAIActionInput,
    ): Promise<AIActionJob> => {
      setIsCreating(true);
      setRequestError(null);

      try {
        const response =
          await requestJson<AIActionJobResponse>(
            apiUrl(
              normalizedApiBaseUrl,
              "/api/ai/actions",
            ),
            {
              method: "POST",
              body: JSON.stringify({
                action: input.action,
                clipId: input.clipId,
                projectId:
                  input.projectId,
                provider: input.provider,
                parameters:
                  input.parameters ?? {},
              }),
            },
          );

        const job = normalizeJob(response);

        setRestJobs((current) => ({
          ...current,
          [job.id]: job,
        }));

        return job;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not create AI job";

        setRequestError(message);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [normalizedApiBaseUrl],
  );

  const refreshJobs = useCallback(
    async (
      filters: {
        projectId?: string;
        clipId?: string;
        limit?: number;
      } = {},
    ): Promise<AIActionJob[]> => {
      setIsLoading(true);
      setRequestError(null);

      try {
        const search =
          new URLSearchParams();

        if (filters.projectId) {
          search.set(
            "project_id",
            filters.projectId,
          );
        }

        if (filters.clipId) {
          search.set(
            "clip_id",
            filters.clipId,
          );
        }

        if (filters.limit) {
          search.set(
            "limit",
            String(filters.limit),
          );
        }

        const query = search.toString();
        const path =
          `/api/ai/actions${query ? `?${query}` : ""}`;

        const response =
          await requestJson<
            AIActionJobResponse[]
          >(
            apiUrl(
              normalizedApiBaseUrl,
              path,
            ),
          );

        const normalized =
          response.map(normalizeJob);

        setRestJobs((current) => {
          const next = {
            ...current,
          };

          for (const job of normalized) {
            next[job.id] = job;
          }

          return next;
        });

        return normalized;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not load AI jobs";

        setRequestError(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [normalizedApiBaseUrl],
  );

  const refreshJob = useCallback(
    async (
      jobId: string,
    ): Promise<AIActionJob> => {
      setRequestError(null);

      try {
        const response =
          await requestJson<AIActionJobResponse>(
            apiUrl(
              normalizedApiBaseUrl,
              `/api/ai/actions/${encodeURIComponent(
                jobId,
              )}`,
            ),
          );

        const job = normalizeJob(response);

        setRestJobs((current) => ({
          ...current,
          [job.id]: job,
        }));

        return job;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not load AI job";

        setRequestError(message);
        throw error;
      }
    },
    [normalizedApiBaseUrl],
  );

  const deleteJob = useCallback(
    async (jobId: string): Promise<void> => {
      setRequestError(null);

      try {
        await requestJson<unknown>(
          apiUrl(
            normalizedApiBaseUrl,
            `/api/ai/actions/${encodeURIComponent(
              jobId,
            )}`,
          ),
          {
            method: "DELETE",
          },
        );

        setRestJobs((current) => {
          if (!(jobId in current)) {
            return current;
          }

          const next = {
            ...current,
          };
          delete next[jobId];
          return next;
        });

        stream.removeJob(jobId);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not delete AI job";

        setRequestError(message);
        throw error;
      }
    },
    [
      normalizedApiBaseUrl,
      stream,
    ],
  );

  const getJob = useCallback(
    (jobId: string) => jobs[jobId],
    [jobs],
  );

  const clearRequestError =
    useCallback(() => {
      setRequestError(null);
    }, []);

  const value = useMemo<
    AIActionContextValue
  >(
    () => ({
      jobs,
      orderedJobs,
      activeJobs,
      isLoading,
      isCreating,
      streamStatus: stream.status,
      streamError: stream.error,
      requestError,
      createJob,
      refreshJobs,
      refreshJob,
      deleteJob,
      getJob,
      clearRequestError,
    }),
    [
      activeJobs,
      clearRequestError,
      createJob,
      deleteJob,
      getJob,
      isCreating,
      isLoading,
      jobs,
      orderedJobs,
      refreshJob,
      refreshJobs,
      requestError,
      stream.error,
      stream.status,
    ],
  );

  return (
    <AIActionContext.Provider
      value={value}
    >
      {children}
    </AIActionContext.Provider>
  );
}


export function useAIActions():
  AIActionContextValue {
  const context = useContext(
    AIActionContext,
  );

  if (!context) {
    throw new Error(
      "useAIActions must be used inside AIActionProvider",
    );
  }

  return context;
}