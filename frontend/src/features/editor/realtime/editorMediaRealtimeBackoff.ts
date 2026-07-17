/**
 * Reconnect delay helpers for editor media realtime connections.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimeBackoff.ts
 */

export interface EditorMediaRealtimeBackoffOptions {
  attempt: number;
  initialDelayMs: number;
  maxDelayMs: number;
  jitterRatio?: number;
}

const DEFAULT_JITTER_RATIO = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizePositiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Calculates capped exponential backoff with symmetric jitter.
 *
 * Attempt zero returns approximately the initial delay. Each subsequent
 * attempt doubles the delay until maxDelayMs is reached.
 */
export function getEditorMediaRealtimeReconnectDelay({
  attempt,
  initialDelayMs,
  maxDelayMs,
  jitterRatio = DEFAULT_JITTER_RATIO,
}: EditorMediaRealtimeBackoffOptions): number {
  const normalizedAttempt = Math.max(0, Math.floor(attempt));
  const normalizedInitialDelay = normalizePositiveNumber(initialDelayMs, 1_000);
  const normalizedMaxDelay = Math.max(
    normalizedInitialDelay,
    normalizePositiveNumber(maxDelayMs, 30_000),
  );
  const normalizedJitterRatio = clamp(
    Number.isFinite(jitterRatio) ? jitterRatio : DEFAULT_JITTER_RATIO,
    0,
    1,
  );

  const exponentialDelay = Math.min(
    normalizedMaxDelay,
    normalizedInitialDelay * 2 ** normalizedAttempt,
  );

  if (normalizedJitterRatio === 0) {
    return Math.round(exponentialDelay);
  }

  const jitterRange = exponentialDelay * normalizedJitterRatio;
  const jitter = (Math.random() * 2 - 1) * jitterRange;

  return Math.round(
    clamp(
      exponentialDelay + jitter,
      normalizedInitialDelay,
      normalizedMaxDelay,
    ),
  );
}