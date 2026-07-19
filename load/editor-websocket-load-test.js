import ws from "k6/ws";
import { check } from "k6";

export const options = {
  vus: 50,
  duration: "2m",

  thresholds: {
    checks: ["rate>0.99"],
  },
};

const WS_URL = __ENV.WS_URL ?? "ws://localhost:3000/ws";

export default function () {
  const response = ws.connect(WS_URL, {}, function (socket) {
    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          type: "ping",
          timestamp: Date.now(),
        })
      );
    });

    socket.on("message", (message) => {
      check(
        { message },
        {
          "received websocket message": (m) =>
            m.message !== undefined && m.message !== null,
        }
      );

      socket.close();
    });

    socket.on("error", (error) => {
      console.error(`WebSocket error: ${error}`);
    });

    socket.on("close", () => {
      // Connection closed
    });

    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });

  check(response, {
    "websocket handshake (101)": (r) =>
      r && r.status === 101,
  });
}