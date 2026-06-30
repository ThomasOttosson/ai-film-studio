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

export async function generateStoryboard(
  data: StoryboardRequest
): Promise<Scene[]> {
  const response = await api.post<Scene[]>("/api/storyboard", data);
  return response.data;
}

export default api;