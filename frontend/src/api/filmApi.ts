import axios from "axios";
import type { Scene } from "../types/film";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export interface StoryboardRequest {
  title: string;
  idea: string;
  genre: string;
  style: string;
  scene_count: number;
}

export interface ImageRequest {
  scene_title: string;
  narration: string;
  mood: string;
  style: string;
}

export interface ImageResponse {
  image_url: string;
  prompt: string;
}

export interface AudioRequest {
  scene_title: string;
  narration: string;
  voice: string;
}

export interface AudioResponse {
  audio_url: string;
  prompt: string;
}

export async function generateSceneAudio(
  data: AudioRequest
): Promise<AudioResponse> {
  const response = await api.post<AudioResponse>("/api/generate-audio", data);
  return response.data;
}

export async function generateStoryboard(
  data: StoryboardRequest
): Promise<Scene[]> {
  const response = await api.post<Scene[]>("/api/storyboard", data);
  return response.data;
}

export async function generateSceneImage(
  data: ImageRequest
): Promise<ImageResponse> {
  const response = await api.post<ImageResponse>("/api/generate-image", data);
  return response.data;
}

export default api;