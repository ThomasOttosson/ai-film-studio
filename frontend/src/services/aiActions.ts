export type AIActionType =
  | "extend-scene"
  | "cinematic-motion"
  | "remove-background"
  | "change-style"
  | "enhance-quality"
  | "generate-voiceover"
  | "clean-audio"
  | "rewrite-narration";

export interface AIActionClip {
  id: string;
  title?: string;
  prompt?: string;
  narration?: string;
  mediaUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  duration?: number;
  startTime?: number;
  type?: string;
  [key: string]: unknown;
}

export interface AIActionRequest {
  action: AIActionType;
  clip: AIActionClip;
  prompt?: string;
  strength?: number;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface AIActionJob {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  action: AIActionType;
  clipId: string;
  progress?: number;
  result?: Record<string, unknown>;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QueueAIActionEventDetail extends AIActionRequest {
  onQueued?: (job: AIActionJob) => void;
  onError?: (error: Error) => void;
}

export const AI_ACTION_EVENT = "ai-film-studio:queue-ai-action";

const DEFAULT_API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8000";

function getAuthToken(): string | null {
  return (
    localStorage.getItem("access_token") ??
    localStorage.getItem("token") ??
    sessionStorage.getItem("access_token") ??
    sessionStorage.getItem("token")
  );
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    let message = `The AI job could not be started (${response.status}).`;

    try {
      if (isJson) {
        const payload = (await response.json()) as {
          detail?: string;
          message?: string;
          error?: string;
        };

        message =
          payload.detail ??
          payload.message ??
          payload.error ??
          message;
      } else {
        const text = await response.text();
        if (text.trim()) {
          message = text;
        }
      }
    } catch {
      // Keep the generic error message if the response cannot be read.
    }

    throw new Error(message);
  }

  if (!isJson) {
    throw new Error("The backend returned an unexpected response.");
  }

  return (await response.json()) as T;
}

export async function queueAIAction(
  request: AIActionRequest,
  signal?: AbortSignal,
): Promise<AIActionJob> {
  if (!request.clip?.id) {
    throw new Error("A selected clip is required to start the AI job.");
  }

  if (!request.action) {
    throw new Error("No AI action has been selected.");
  }

  const token = getAuthToken();

  const response = await fetch(`${DEFAULT_API_BASE}/api/ai/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      action: request.action,
      clip_id: request.clip.id,
      clip: request.clip,
      prompt: request.prompt?.trim() || undefined,
      strength:
        typeof request.strength === "number"
          ? Math.min(1, Math.max(0, request.strength))
          : undefined,
      project_id: request.projectId,
      metadata: request.metadata,
    }),
    signal,
  });

  return parseResponse<AIActionJob>(response);
}

export async function getAIActionJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<AIActionJob> {
  if (!jobId) {
    throw new Error("Job id is missing.");
  }

  const token = getAuthToken();

  const response = await fetch(
    `${DEFAULT_API_BASE}/api/ai/actions/${encodeURIComponent(jobId)}`,
    {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    },
  );

  return parseResponse<AIActionJob>(response);
}

export async function waitForAIActionJob(
  jobId: string,
  options: {
    signal?: AbortSignal;
    intervalMs?: number;
    timeoutMs?: number;
    onProgress?: (job: AIActionJob) => void;
  } = {},
): Promise<AIActionJob> {
  const intervalMs = Math.max(500, options.intervalMs ?? 1500);
  const timeoutMs = Math.max(intervalMs, options.timeoutMs ?? 10 * 60 * 1000);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (options.signal?.aborted) {
      throw new DOMException("The AI job was cancelled.", "AbortError");
    }

    const job = await getAIActionJob(jobId, options.signal);
    options.onProgress?.(job);

    if (job.status === "completed") {
      return job;
    }

    if (job.status === "failed") {
      throw new Error(job.error || "The AI job failed.");
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(resolve, intervalMs);

      const abort = () => {
        window.clearTimeout(timeout);
        reject(new DOMException("The AI job was cancelled.", "AbortError"));
      };

      options.signal?.addEventListener("abort", abort, { once: true });
    });
  }

  throw new Error("The AI job took too long and was cancelled.");
}

export function dispatchAIAction(request: QueueAIActionEventDetail): void {
  window.dispatchEvent(
    new CustomEvent<QueueAIActionEventDetail>(AI_ACTION_EVENT, {
      detail: request,
    }),
  );
}

export function registerAIActionQueueListener(): () => void {
  const controllers = new Map<string, AbortController>();

  const listener = async (event: Event) => {
    const customEvent = event as CustomEvent<QueueAIActionEventDetail>;
    const detail = customEvent.detail;

    if (!detail?.clip?.id || !detail.action) {
      detail?.onError?.(
        new Error("The AI event is missing a clip or selected action."),
      );
      return;
    }

    const requestKey = `${detail.clip.id}:${detail.action}`;
    controllers.get(requestKey)?.abort();

    const controller = new AbortController();
    controllers.set(requestKey, controller);

    try {
      const job = await queueAIAction(detail, controller.signal);
      detail.onQueued?.(job);

      window.dispatchEvent(
        new CustomEvent("ai-film-studio:ai-job-queued", {
          detail: job,
        }),
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      const normalizedError =
        error instanceof Error
          ? error
          : new Error("An unknown error occurred.");

      detail.onError?.(normalizedError);

      window.dispatchEvent(
        new CustomEvent("ai-film-studio:ai-job-error", {
          detail: {
            action: detail.action,
            clipId: detail.clip.id,
            error: normalizedError.message,
          },
        }),
      );
    } finally {
      if (controllers.get(requestKey) === controller) {
        controllers.delete(requestKey);
      }
    }
  };

  window.addEventListener(AI_ACTION_EVENT, listener);

  return () => {
    window.removeEventListener(AI_ACTION_EVENT, listener);
    controllers.forEach((controller) => controller.abort());
    controllers.clear();
  };
}