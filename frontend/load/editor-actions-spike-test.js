import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    spike_editor_actions: {
      executor: "ramping-vus",
      stages: [
        { duration: "15s", target: 0 },
        { duration: "20s", target: 100 },
        { duration: "1m", target: 100 },
        { duration: "20s", target: 0 },
      ],
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2500"],
  },
};

const BASE_URL = __ENV.BASE_URL ?? "http://localhost:3000";
const ACTION_PATH = __ENV.ACTION_PATH ?? "/api/ai/actions";

function createPayload() {
  return JSON.stringify({
    type: "generate",
    input: {
      prompt: `spike-${__VU}-${__ITER}`,
    },
    metadata: {
      source: "k6",
      virtualUser: __VU,
      iteration: __ITER,
      testType: "spike",
    },
  });
}

export default function () {
  const response = http.post(
    `${BASE_URL}${ACTION_PATH}`,
    createPayload(),
    {
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": `spike-${__VU}-${__ITER}-${Date.now()}`,
      },
      timeout: "15s",
      tags: {
        scenario: "editor-spike",
      },
    }
  );

  check(response, {
    "accepted": (r) =>
      r.status === 200 ||
      r.status === 201 ||
      r.status === 202,

    "json response": (r) =>
      (r.headers["Content-Type"] || "").includes("application/json"),

    "contains job id": (r) => {
      try {
        const body = r.json();
        return !!(body.jobId || body.id);
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}