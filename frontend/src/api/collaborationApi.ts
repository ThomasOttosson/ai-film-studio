import apiClient from "./client";
import type { ProjectRole } from "../utils/projectStorage";

export interface ProjectMember {
  id: number;
  userId: number;
  email: string;
  role: ProjectRole;
  createdAt: string;
}

export async function listProjectMembers(projectId: string) {
  const response = await apiClient.get<ProjectMember[]>(
    `/api/projects/${projectId}/members`
  );
  return response.data;
}

export async function inviteProjectMember(
  projectId: string,
  email: string,
  role: "editor" | "viewer"
) {
  const response = await apiClient.post<ProjectMember>(
    `/api/projects/${projectId}/members`,
    { email, role }
  );
  return response.data;
}

export async function updateProjectMemberRole(
  projectId: string,
  memberId: number,
  role: "editor" | "viewer"
) {
  const response = await apiClient.patch<ProjectMember>(
    `/api/projects/${projectId}/members/${memberId}`,
    { role }
  );
  return response.data;
}

export async function removeProjectMember(
  projectId: string,
  memberId: number
) {
  await apiClient.delete(`/api/projects/${projectId}/members/${memberId}`);
}