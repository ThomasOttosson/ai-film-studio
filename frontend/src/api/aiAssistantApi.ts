import apiClient from "./client";
import type { SavedProjectData } from "../utils/projectStorage";

export interface AiAssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiAssistantProjectContext {
  name: string;
  data: SavedProjectData;
}

export interface SendAiAssistantMessageRequest {
  projectId: string;
  message: string;
  history?: AiAssistantChatMessage[];
  project: AiAssistantProjectContext;
}

export interface AiAssistantChangeProposal {
  summary: string;
  projectData: SavedProjectData;
}

export interface AiAssistantMessageResponse {
  reply: string;
  proposal: AiAssistantChangeProposal | null;
}

interface ApiChangeProposal {
  summary?: unknown;
  project_data?: unknown;
}

interface ApiMessageResponse {
  reply?: unknown;
  proposal?: ApiChangeProposal | null;
}

interface ApiErrorResponse {
  detail?: string;
}

function getApiErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: ApiErrorResponse;
        };
      }
    ).response;

    return (
      response?.data?.detail ??
      "The AI assistant request failed."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The AI assistant request failed.";
}

function isSavedProjectData(
  value: unknown
): value is SavedProjectData {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const projectData =
    value as Partial<SavedProjectData>;

  return (
    typeof projectData.movieTitle === "string" &&
    typeof projectData.movieIdea === "string" &&
    Array.isArray(projectData.scenes) &&
    typeof projectData.style === "string" &&
    typeof projectData.sceneLength === "number" &&
    typeof projectData.aspectRatio === "string" &&
    typeof projectData.finalMovieUrl === "string"
  );
}

function parseProposal(
  proposal: ApiChangeProposal | null | undefined
): AiAssistantChangeProposal | null {
  if (!proposal) {
    return null;
  }

  if (
    typeof proposal.summary !== "string" ||
    !isSavedProjectData(proposal.project_data)
  ) {
    return null;
  }

  return {
    summary: proposal.summary,
    projectData: proposal.project_data,
  };
}

export async function sendAiAssistantMessage(
  request: SendAiAssistantMessageRequest
): Promise<AiAssistantMessageResponse> {
  try {
    const response =
      await apiClient.post<ApiMessageResponse>(
        "/api/ai-assistant/chat",
        {
          project_id: request.projectId,
          message: request.message,
          history: request.history ?? [],
          project: {
            name: request.project.name,
            data: request.project.data,
          },
        }
      );

    const reply = response.data?.reply;

    if (typeof reply !== "string") {
      throw new Error(
        "The AI assistant returned an invalid response."
      );
    }

    return {
      reply,
      proposal: parseProposal(
        response.data.proposal
      ),
    };
  } catch (error) {
    console.error(
      "AI assistant API request failed:",
      error
    );

    throw new Error(getApiErrorMessage(error));
  }
}