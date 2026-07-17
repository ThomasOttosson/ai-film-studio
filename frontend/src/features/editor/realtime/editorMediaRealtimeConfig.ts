/**
 * Runtime configuration helpers for editor media realtime connections.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimeConfig.ts
 */

export interface EditorMediaRealtimeConfig {
  url: string;
  reconnectDelayMs: number;
  maxReconnectDelayMs: number;
  heartbeatIntervalMs: number;
}

const DEFAULT_RECONNECT_DELAY_MS = 1_000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 25_000;

function normalizeWebSocketUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Editor media realtime URL cannot be empty.");
  }

  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return trimmed;
  }

  if (trimmed.startsWith("http://")) {
    return `ws://${trimmed.slice("http://".length)}`;
  }

  if (trimmed.startsWith("https://")) {
    return `wss://${trimmed.slice("https://".length)}`;
  }

  const protocol =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "wss:"
      : "ws:";

  const origin =
    typeof window !== "undefined"
      ? window.location.host
      : "localhost";

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${protocol}//${origin}${path}`;
}

function positiveNumber(
  value: number | undefined,
  fallback: number,
): number {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? Number(value)
    : fallback;
}

export interface CreateEditorMediaRealtimeConfigOptions {
  url?: string;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  heartbeatIntervalMs?: number;
}

export function createEditorMediaRealtimeConfig({
  url = "/api/realtime/editor-media",
  reconnectDelayMs,
  maxReconnectDelayMs,
  heartbeatIntervalMs,
}: CreateEditorMediaRealtimeConfigOptions = {}): EditorMediaRealtimeConfig {
  const normalizedReconnectDelayMs = positiveNumber(
    reconnectDelayMs,
    DEFAULT_RECONNECT_DELAY_MS,
  );

  const normalizedMaxReconnectDelayMs = Math.max(
    normalizedReconnectDelayMs,
    positiveNumber(
      maxReconnectDelayMs,
      DEFAULT_MAX_RECONNECT_DELAY_MS,
    ),
  );

  return {
    url: normalizeWebSocketUrl(url),
    reconnectDelayMs: normalizedReconnectDelayMs,
    maxReconnectDelayMs: normalizedMaxReconnectDelayMs,
    heartbeatIntervalMs: positiveNumber(
      heartbeatIntervalMs,
      DEFAULT_HEARTBEAT_INTERVAL_MS,
    ),
  };
}