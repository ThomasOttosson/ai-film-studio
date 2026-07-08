import type { Scene } from "../types/film";
import type { QueueStep } from "../components/GenerationQueue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface StartGenerationQueuePayload {
  scenes: Scene[];
  style: string;
  sceneLength: number;
  aspectRatio: string;
}

export interface GenerationQueueResponse {
  id?: string;
  batch_id?: string;
  status: string;
  steps: QueueStep[];
  scenes: Scene[];
}

export async function startGenerationQueue(
  payload: StartGenerationQueuePayload
) {
  const response = await fetch(`${API_BASE_URL}/api/generation-queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to start generation queue");
  }

  return response.json() as Promise<GenerationQueueResponse>;
}

export async function getGenerationQueue(batchId: string) {
  const response = await fetch(`${API_BASE_URL}/api/generation-queue/${batchId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch generation queue");
  }

  return response.json() as Promise<GenerationQueueResponse>;
}