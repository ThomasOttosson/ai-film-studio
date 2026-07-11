import apiClient from "./client";
import type { Scene } from "../types/film";

export interface StoryboardRequest {
  title: string;
  idea: string;
  genre: string;
  style: string;
  scene_count: number;
  scene_length: number;
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

export interface VideoRequest {
  scene_title: string;
  image_url: string;
  audio_url: string;
  scene_length: number;
  aspect_ratio: string;
}

export interface VideoResponse {
  video_url: string;
  prompt: string;
}

export async function generateSceneVideo(
  data: VideoRequest
): Promise<VideoResponse> {
  const response = await apiClient.post<VideoResponse>(
    "/api/generate-video",
    data
  );

  return response.data;
}

export async function generateSceneAudio(
  data: AudioRequest
): Promise<AudioResponse> {
  const response = await apiClient.post<AudioResponse>(
    "/api/generate-audio",
    data
  );

  return response.data;
}

export async function generateStoryboard(
  data: StoryboardRequest
): Promise<Scene[]> {
  const response = await apiClient.post<Scene[]>(
    "/api/storyboard",
    data
  );

  return response.data;
}

export async function generateSceneImage(
  data: ImageRequest
): Promise<ImageResponse> {
  const response = await apiClient.post<ImageResponse>(
    "/api/generate-image",
    data
  );

  return response.data;
}

export interface FullMovieRequest {
  title: string;
  video_urls: string[];
}

export interface FullMovieResponse {
  final_movie_url: string;
  title: string;
}

export async function generateFullMovie(
  data: FullMovieRequest
): Promise<FullMovieResponse> {
  const response = await apiClient.post<FullMovieResponse>(
    "/api/generate-full-movie",
    data
  );

  return response.data;
}

export default apiClient;