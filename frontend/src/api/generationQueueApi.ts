import type { QueueStep } from "../components/GenerationQueue";
import type { Scene } from "../types/film";
import apiClient from "./client";

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
  status: string;
  cancel_requested?: boolean;
  steps: QueueStep[];
  scenes: Scene[];
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

export async function retryFailedGenerationQueue(
  batchId: string
): Promise<GenerationQueueResponse> {
  const response = await apiClient.post<GenerationQueueResponse>(
    `/api/generation-queue/${batchId}/retry-failed`
  );

  return response.data;
}