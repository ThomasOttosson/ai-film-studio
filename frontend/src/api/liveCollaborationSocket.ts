import { AUTH_TOKEN_KEY } from "./client";
import type { SavedProjectData } from "../utils/projectStorage";
import type { CollaborationRole } from "./liveCollaborationApi";

export type LiveSocketMessage =
  | {
      event: "connected";
      sessionId: string;
      userId: number;
      email: string;
      role: CollaborationRole | "owner";
    }
  | { event: "presence"; onlineUserIds: number[] }
  | { event: "project_update"; data: SavedProjectData; updatedBy: string }
  | { event: "role_changed"; userId: number; role: CollaborationRole }
  | { event: "participant_removed"; userId: number }
  | { event: "permission_denied"; message: string }
  | { event: "pong" };

interface Options {
  sessionId: string;
  onOpen?: () => void;
  onMessage: (message: LiveSocketMessage) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export function connectLiveCollaborationSocket(options: Options) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error("Authentication token is missing");

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const websocketBase = apiBase.replace(/^http/, "ws");
  const socket = new WebSocket(
    `${websocketBase}/ws/live-collaboration/${options.sessionId}?token=${encodeURIComponent(token)}`
  );

  socket.onopen = () => options.onOpen?.();
  socket.onerror = (event) => options.onError?.(event);
  socket.onclose = (event) => options.onClose?.(event);
  socket.onmessage = (event) => {
    try {
      options.onMessage(JSON.parse(event.data) as LiveSocketMessage);
    } catch (error) {
      console.error("Invalid live collaboration message:", error);
    }
  };

  return {
    sendProjectUpdate(data: SavedProjectData) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event: "project_update", data }));
      }
    },
    sendPing() {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event: "ping" }));
      }
    },
    close() {
      socket.close();
    },
  };
}