import type { QueueStep } from "../components/GenerationQueue";
import type { Scene } from "../types/film";
import apiClient from "./client";

export type GenerationQueueStatus =
  | "waiting"
  | "running"
  | "pause_requested"
  | "paused"
  | "cancel_requested"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled"
  | "not_found";

export interface StartGenerationQueuePayload {
  projectId: string;
  scenes: Scene[];
  style: string;
  sceneLength: number;
  aspectRatio: string;
}

export interface GenerationQueueResponse {
  id?: string;
  batch_id?: string;
  status: GenerationQueueStatus;
  cancel_requested?: boolean;
  pause_requested?: boolean;
  steps: QueueStep[];
  scenes: Scene[];
  totalSteps?: number;
  completedSteps?: number;
  failedSteps?: number;
  cancelledSteps?: number;
  progressPercent?: number;
  estimatedRemainingSeconds?: number;
  currentStep?: QueueStep | null;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export async function startGenerationQueue(
  payload: StartGenerationQueuePayload
): Promise<GenerationQueueResponse> {
  const response = await apiClient.post<GenerationQueueResponse>(
    "/api/generation-queue",
    payload
  );

  return response.data;
}

export async function getGenerationQueue(
  batchId: string
): Promise<GenerationQueueResponse> {
  const response = await apiClient.get<GenerationQueueResponse>(
    `/api/generation-queue/${batchId}`
  );

  return response.data;
}

export async function cancelGenerationQueue(
  batchId: string
): Promise<GenerationQueueResponse> {
  const response = await apiClient.post<GenerationQueueResponse>(
    `/api/generation-queue/${batchId}/cancel`
  );

  return response.data;
}

export async function pauseGenerationQueue(
  batchId: string
): Promise<GenerationQueueResponse> {
  const response = await apiClient.post<GenerationQueueResponse>(
    `/api/generation-queue/${batchId}/pause`
  );

  return response.data;
}

export async function resumeGenerationQueue(
  batchId: string
): Promise<GenerationQueueResponse> {
  const response = await apiClient.post<GenerationQueueResponse>(
    `/api/generation-queue/${batchId}/resume`
  );

  return response.data;
}

export async function retryFailedGenerationQueue(
  batchId: string
): Promise<GenerationQueueResponse> {
  const response = await apiClient.post<GenerationQueueResponse>(
    `/api/generation-queue/${batchId}/retry-failed`
  );

  return response.data;
}