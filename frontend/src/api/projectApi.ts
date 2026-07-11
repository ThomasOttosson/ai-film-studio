import apiClient from "./client";
import type {
  SavedProjectData,
  StoredProject,
} from "../utils/projectStorage";

interface ProjectPayload {
  name: string;
  thumbnail: string | null;
  data: SavedProjectData;
}

function createPayload(data: SavedProjectData): ProjectPayload {
  return {
    name: data.movieTitle.trim() || "Untitled Project",
    thumbnail:
      data.scenes.find((scene) => scene.imageUrl)?.imageUrl ?? null,
    data,
  };
}

export async function listProjects(): Promise<StoredProject[]> {
  const response = await apiClient.get<StoredProject[]>("/api/projects");
  return response.data;
}

export async function createProject(
  data: SavedProjectData
): Promise<StoredProject> {
  const response = await apiClient.post<StoredProject>(
    "/api/projects",
    createPayload(data)
  );
  return response.data;
}

export async function updateProject(
  projectId: string,
  data: SavedProjectData
): Promise<StoredProject> {
  const response = await apiClient.put<StoredProject>(
    `/api/projects/${projectId}`,
    createPayload(data)
  );
  return response.data;
}

export async function duplicateProject(
  projectId: string
): Promise<StoredProject> {
  const response = await apiClient.post<StoredProject>(
    `/api/projects/${projectId}/duplicate`
  );
  return response.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/api/projects/${projectId}`);
}