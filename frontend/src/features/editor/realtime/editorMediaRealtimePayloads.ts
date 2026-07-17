/**
 * Typed payload contracts for editor media realtime events.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimePayloads.ts
 */

export interface EditorMediaRealtimeAsset {
  id: string;
  name?: string;
  type?: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface EditorMediaCreatedPayload {
  asset: EditorMediaRealtimeAsset;
}

export interface EditorMediaUpdatedPayload {
  asset: EditorMediaRealtimeAsset;
}

export interface EditorMediaDeletedPayload {
  assetId: string;
}

export interface EditorMediaJobStartedPayload {
  jobId: string;
  action?: string;
  progress?: number;
}

export interface EditorMediaJobProgressPayload {
  jobId: string;
  progress: number;
  message?: string;
}

export interface EditorMediaJobCompletedPayload {
  jobId: string;
  asset?: EditorMediaRealtimeAsset;
  result?: unknown;
}

export interface EditorMediaJobFailedPayload {
  jobId: string;
  error: string;
  code?: string;
}

export interface EditorMediaRealtimePayloadMap {
  "media.created": EditorMediaCreatedPayload;
  "media.updated": EditorMediaUpdatedPayload;
  "media.deleted": EditorMediaDeletedPayload;
  "job.started": EditorMediaJobStartedPayload;
  "job.progress": EditorMediaJobProgressPayload;
  "job.completed": EditorMediaJobCompletedPayload;
  "job.failed": EditorMediaJobFailedPayload;
  ping: Record<string, never>;
  pong: Record<string, never>;
}