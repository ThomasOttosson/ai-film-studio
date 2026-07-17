"""
backend/providers/runway_provider.py
"""

from __future__ import annotations

import os
from typing import Any

import httpx


class RunwayProvider:
    """
    Adapter for submitting AI generation jobs to Runway.
    Returns the provider job id so the worker can track completion.
    """

    def __init__(self) -> None:
        self._api_key = os.getenv("RUNWAY_API_KEY")
        if not self._api_key:
            raise RuntimeError("RUNWAY_API_KEY is not configured")

        self._base_url = os.getenv(
            "RUNWAY_API_BASE",
            "https://api.runwayml.com/v1",
        )

    async def execute(self, job: Any) -> dict[str, Any]:
        if isinstance(job, dict):
            action = job.get("action")
            payload = job.get("payload", {})
        else:
            action = getattr(job, "action")
            payload = getattr(job, "payload", {})

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{self._base_url}/tasks",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "taskType": action,
                    "input": payload,
                },
            )

            response.raise_for_status()
            data = response.json()

        return {
            "provider": "runway",
            "action": action,
            "provider_job_id": data["id"],
            "status": data.get("status", "queued"),
            "raw": data,
        }