import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate } from "k6/metrics";

const reconnects = new Counter("reconnects");
const failures = new Rate("reconnect_failures");

export const options = {
  scenarios: {
    reconnect_stress: {
      executor: "constant-vus",
      vus: 50,
      duration: "2m",
    },
  },

  thresholds: {
    reconnect_failures: ["rate<0.02"],
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1500"],
  },
};

const BASE_URL = __ENV.BASE_URL ?? "http://localhost:3000";
const HEALTH_ENDPOINT = __ENV.HEALTH_ENDPOINT ?? "/api/health";

export default function () {
  reconnects.add(1);

  const response = http.get(`${BASE_URL}${HEALTH_ENDPOINT}`, {
    headers: {
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    },
  });

  const ok = check(response, {
    "health endpoint reachable": (r) => r.status === 200,
    "response body exists": (r) => r.body.length > 0,
  });

  failures.add(!ok);

  sleep(Math.random() * 2);
}