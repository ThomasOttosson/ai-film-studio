import apiClient from "./client";

export type CollaborationRole = "editor" | "viewer";
export type InvitationStatus = "pending" | "accepted" | "declined";
export type SessionStatus = "active" | "closed";

export interface EligibleUser {
  userId: number;
  email: string;
  projectRole: CollaborationRole;
}

export interface LiveParticipant {
  id: number;
  userId: number;
  email: string;
  role: CollaborationRole;
  joinedAt: string;
}

export interface LiveInvitation {
  id: number;
  sessionId: string;
  projectId: string;
  projectName: string;
  invitedUserId: number;
  invitedUserEmail: string;
  invitedByEmail: string;
  role: CollaborationRole;
  status: InvitationStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface LiveSession {
  id: string;
  projectId: string;
  projectName: string;
  createdBy: number;
  createdByEmail: string;
  status: SessionStatus;
  createdAt: string;
  closedAt: string | null;
  invitations: LiveInvitation[];
  participants: LiveParticipant[];
}

export async function searchEligibleUsers(
  projectId: string,
  query: string,
  limit = 10
) {
  const response = await apiClient.get<EligibleUser[]>(
    `/api/live-collaboration/eligible-users/${projectId}`,
    { params: { q: query, limit } }
  );
  return response.data;
}

export async function createLiveSession(projectId: string) {
  const response = await apiClient.post<LiveSession>(
    "/api/live-collaboration/sessions",
    { projectId }
  );
  return response.data;
}

export async function getActiveProjectSession(projectId: string) {
  const response = await apiClient.get<LiveSession | null>(
    `/api/live-collaboration/sessions/project/${projectId}`
  );
  return response.data;
}

export async function sendLiveInvitation(
  sessionId: string,
  userId: number,
  role: CollaborationRole
) {
  const response = await apiClient.post<LiveInvitation>(
    `/api/live-collaboration/sessions/${sessionId}/invitations`,
    { userId, role }
  );
  return response.data;
}

export async function listMyLiveInvitations() {
  const response = await apiClient.get<LiveInvitation[]>(
    "/api/live-collaboration/invitations"
  );
  return response.data;
}

export async function respondToLiveInvitation(
  invitationId: number,
  responseValue: "accepted" | "declined"
) {
  const response = await apiClient.patch<LiveInvitation>(
    `/api/live-collaboration/invitations/${invitationId}`,
    { response: responseValue }
  );
  return response.data;
}

export async function updateLiveParticipantRole(
  sessionId: string,
  participantId: number,
  role: CollaborationRole
) {
  const response = await apiClient.patch<LiveParticipant>(
    `/api/live-collaboration/sessions/${sessionId}/participants/${participantId}`,
    { role }
  );
  return response.data;
}

export async function removeLiveParticipant(
  sessionId: string,
  participantId: number
) {
  await apiClient.delete(
    `/api/live-collaboration/sessions/${sessionId}/participants/${participantId}`
  );
}

export async function revokeLiveInvitation(
  sessionId: string,
  invitationId: number
) {
  await apiClient.delete(
    `/api/live-collaboration/sessions/${sessionId}/invitations/${invitationId}`
  );
}

export async function closeLiveSession(sessionId: string) {
  const response = await apiClient.post<LiveSession>(
    `/api/live-collaboration/sessions/${sessionId}/close`
  );
  return response.data;
}


export async function leaveLiveSession(sessionId: string) {
  await apiClient.post(
    `/api/live-collaboration/sessions/${sessionId}/leave`
  );
}