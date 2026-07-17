import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const baseUrl = __ENV.BASE_URL ?? "http://localhost:3000";
const actionPath = __ENV.ACTION_PATH ?? "/api/ai/actions";

const acceptedJobs = new Counter("accepted_jobs");
const failedJobs = new Counter("failed_jobs");
const actionFailureRate = new Rate("action_failure_rate");
const actionDuration = new Trend("action_duration", true);

export const options = {
  scenarios: {
    steady_editor_actions: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "2m", target: 10 },
        { duration: "30s", target: 25 },
        { duration: "2m", target: 25 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: [
      "p(95)<1500",
      "p(99)<3000",
    ],
    action_failure_rate: ["rate<0.02"],
    action_duration: ["p(95)<1500"],
  },
};

function createActionPayload() {
  return JSON.stringify({
    type: "generate",
    input: {
      prompt: `load-test-${__VU}-${__ITER}`,
      durationSeconds: 5,
    },
    metadata: {
      source: "k6",
      virtualUser: __VU,
      iteration: __ITER,
    },
  });
}

export default function () {
  const response = http.post(
    `${baseUrl}${actionPath}`,
    createActionPayload(),
    {
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": `k6-${__VU}-${__ITER}-${Date.now()}`,
      },
      tags: {
        operation: "create_ai_action",
      },
      timeout: "10s",
    }
  );

  actionDuration.add(response.timings.duration);

  const accepted = check(response, {
    "action accepted": (result) =>
      result.status === 200 ||
      result.status === 201 ||
      result.status === 202,

    "response is JSON": (result) =>
      (result.headers["Content-Type"] ?? "").includes("application/json"),

    "response has job identifier": (result) => {
      try {
        const body = result.json();
        return Boolean(body.jobId ?? body.id);
      } catch {
        return false;
      }
    },
  });

  actionFailureRate.add(!accepted);

  if (accepted) {
    acceptedJobs.add(1);
  } else {
    failedJobs.add(1);
  }

  sleep(1);
}