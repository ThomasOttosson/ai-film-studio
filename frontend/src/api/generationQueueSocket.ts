import type { GenerationQueueResponse } from "./generationQueueApi";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getWebSocketBaseUrl() {
  return API_BASE_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

export interface GenerationQueueSocketMessage {
  event: "batch_snapshot" | "batch_updated" | "batch_not_found";
  batch_id?: string;
  batch?: GenerationQueueResponse;
}

interface ConnectGenerationQueueSocketOptions {
  batchId: string;
  onMessage: (message: GenerationQueueSocketMessage) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export function connectGenerationQueueSocket({
  batchId,
  onMessage,
  onOpen,
  onClose,
  onError,
}: ConnectGenerationQueueSocketOptions) {
  const socketUrl = `${getWebSocketBaseUrl()}/ws/generation-queue/${batchId}`;
  const socket = new WebSocket(socketUrl);

  socket.onopen = () => {
    console.log("Generation WebSocket opened:", {
      batchId,
      socketUrl,
    });

    onOpen?.();
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(
        event.data
      ) as GenerationQueueSocketMessage;

      onMessage(message);
    } catch (error) {
      console.error(
        "Failed to parse generation queue WebSocket message:",
        error
      );
    }
  };

  socket.onerror = (event) => {
    console.error("Generation WebSocket error:", {
      batchId,
      socketUrl,
      event,
    });

    onError?.(event);
  };

  socket.onclose = (event) => {
    console.log("Generation WebSocket closed:", {
      batchId,
      socketUrl,
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    onClose?.(event);
  };

  return {
    socket,

    close() {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close(1000, "Client closed connection");
      }
    },

    sendPing() {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("ping");
      }
    },
  };
}