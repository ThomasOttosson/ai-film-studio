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
    let message = `AI-jobbet kunde inte startas (${response.status}).`;

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
      // Behåll det generella felmeddelandet om svaret inte kan läsas.
    }

    throw new Error(message);
  }

  if (!isJson) {
    throw new Error("Backend returnerade ett oväntat svar.");
  }

  return (await response.json()) as T;
}

export async function queueAIAction(
  request: AIActionRequest,
  signal?: AbortSignal,
): Promise<AIActionJob> {
  if (!request.clip?.id) {
    throw new Error("Ett markerat klipp krävs för att starta AI-jobbet.");
  }

  if (!request.action) {
    throw new Error("Ingen AI-åtgärd har valts.");
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
    throw new Error("Jobb-id saknas.");
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
      throw new DOMException("AI-jobbet avbröts.", "AbortError");
    }

    const job = await getAIActionJob(jobId, options.signal);
    options.onProgress?.(job);

    if (job.status === "completed") {
      return job;
    }

    if (job.status === "failed") {
      throw new Error(job.error || "AI-jobbet misslyckades.");
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(resolve, intervalMs);

      const abort = () => {
        window.clearTimeout(timeout);
        reject(new DOMException("AI-jobbet avbröts.", "AbortError"));
      };

      options.signal?.addEventListener("abort", abort, { once: true });
    });
  }

  throw new Error("AI-jobbet tog för lång tid och avbröts.");
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
        new Error("AI-eventet saknar klipp eller vald åtgärd."),
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
          : new Error("Ett okänt fel inträffade.");

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