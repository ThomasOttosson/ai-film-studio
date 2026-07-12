import { AUTH_TOKEN_KEY } from "./client";
import type { StoredProject } from "../utils/projectStorage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type CollaborationStatus =
  | "connecting"
  | "connected"
  | "disconnected";

export interface PresenceUser {
  userId: number;
  email: string;
  role: "owner" | "editor" | "viewer";
}

export type ProjectCollaborationMessage =
  | {
      event: "project_snapshot";
      project: StoredProject;
    }
  | {
      event: "project_update";
      project: StoredProject;
      clientId?: string;
      updatedBy?: {
        userId: number;
        email: string;
      };
    }
  | {
      event: "presence";
      users: PresenceUser[];
    }
  | {
      event: "error";
      message: string;
    }
  | {
      event: "pong";
    };

function getWebSocketBaseUrl() {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}

export function connectProjectCollaborationSocket(
  projectId: string,
  handlers: {
    onMessage: (message: ProjectCollaborationMessage) => void;
    onStatusChange?: (status: CollaborationStatus) => void;
  }
) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (!token) {
    handlers.onStatusChange?.("disconnected");
    return null;
  }

  const clientId = crypto.randomUUID();
  const socketUrl = new URL(
    `/ws/projects/${encodeURIComponent(projectId)}`,
    getWebSocketBaseUrl()
  );
  socketUrl.searchParams.set("token", token);

  handlers.onStatusChange?.("connecting");
  const socket = new WebSocket(socketUrl.toString());

  socket.addEventListener("open", () => {
    handlers.onStatusChange?.("connected");
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data) as ProjectCollaborationMessage;
      handlers.onMessage(message);
    } catch (error) {
      console.error("Failed to parse collaboration message:", error);
    }
  });

  socket.addEventListener("close", () => {
    handlers.onStatusChange?.("disconnected");
  });

  socket.addEventListener("error", () => {
    handlers.onStatusChange?.("disconnected");
  });

  return {
    clientId,
    socket,
    sendProjectUpdate(project: StoredProject) {
      if (socket.readyState !== WebSocket.OPEN) return;

      socket.send(
        JSON.stringify({
          event: "project_update",
          clientId,
          project,
        })
      );
    },
    ping() {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event: "ping" }));
      }
    },
    close() {
      socket.close();
    },
  };
}