"""
backend/providers/polling.py

Helpers for polling asynchronous provider jobs.
"""

from __future__ import annotations

import httpx


class ProviderPollingClient:
    def __init__(self, api_key: str, base_url: str) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")

    async def get_job(self, provider_job_id: str) -> dict:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(
                f"{self._base_url}/tasks/{provider_job_id}",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    def is_finished(job: dict) -> bool:
        return job.get("status") in {
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
            "completed",
            "failed",
            "cancelled",
        }

    @staticmethod
    def is_success(job: dict) -> bool:
        return job.get("status") in {
            "SUCCEEDED",
            "completed",
        }