/**
 * Typed drag-and-drop payload helpers for moving media assets into the editor.
 *
 * Placement:
 * frontend/src/features/editor/lib/mediaDragPayload.ts
 */

export const MEDIA_DRAG_MIME_TYPE =
  "application/x-ai-film-studio-media";

export type DraggableMediaKind =
  | "video"
  | "audio"
  | "image";

export interface MediaDragPayload {
  assetId: string;
  kind: DraggableMediaKind;
  name: string;
  sourceUrl: string;
  durationMs?: number;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

const MEDIA_KINDS = new Set<DraggableMediaKind>([
  "video",
  "audio",
  "image",
]);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isOptionalNonNegativeNumber(
  value: unknown,
): value is number | undefined {
  return (
    value === undefined ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0)
  );
}

export function isMediaDragPayload(
  value: unknown,
): value is MediaDragPayload {
  if (!isRecord(value)) {
    return false;
  }

  const kind = value.kind;

  return (
    isNonEmptyString(value.assetId) &&
    typeof kind === "string" &&
    MEDIA_KINDS.has(kind as DraggableMediaKind) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.sourceUrl) &&
    isOptionalNonNegativeNumber(value.durationMs) &&
    (value.thumbnailUrl === undefined ||
      isNonEmptyString(value.thumbnailUrl)) &&
    (value.metadata === undefined ||
      isRecord(value.metadata))
  );
}

export function serializeMediaDragPayload(
  payload: MediaDragPayload,
): string {
  if (!isMediaDragPayload(payload)) {
    throw new TypeError(
      "Cannot serialize an invalid media drag payload.",
    );
  }

  return JSON.stringify(payload);
}

export function parseMediaDragPayload(
  serialized: string,
): MediaDragPayload | null {
  if (!serialized.trim()) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(serialized);

    return isMediaDragPayload(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function writeMediaDragPayload(
  dataTransfer: DataTransfer,
  payload: MediaDragPayload,
): void {
  const serialized =
    serializeMediaDragPayload(payload);

  dataTransfer.effectAllowed = "copy";
  dataTransfer.setData(
    MEDIA_DRAG_MIME_TYPE,
    serialized,
  );

  // Fallback for browsers or integrations that strip custom MIME types.
  dataTransfer.setData("text/plain", serialized);
}

export function readMediaDragPayload(
  dataTransfer: DataTransfer,
): MediaDragPayload | null {
  const customPayload = dataTransfer.getData(
    MEDIA_DRAG_MIME_TYPE,
  );

  if (customPayload) {
    return parseMediaDragPayload(customPayload);
  }

  return parseMediaDragPayload(
    dataTransfer.getData("text/plain"),
  );
}

export function containsMediaDragPayload(
  dataTransfer: DataTransfer,
): boolean {
  return Array.from(dataTransfer.types).some(
    (type) =>
      type === MEDIA_DRAG_MIME_TYPE ||
      type === "text/plain",
  );
}