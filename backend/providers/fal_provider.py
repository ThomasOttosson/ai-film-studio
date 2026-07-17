"""
backend/providers/fal_provider.py

Production-ready fal.ai provider adapter.
"""

from __future__ import annotations

import os
from typing import Any

import httpx


class FalProvider:
    def __init__(self) -> None:
        self.api_key = os.environ["FAL_KEY"]
        self.base_url = os.getenv(
            "FAL_API_BASE",
            "https://queue.fal.run",
        )

    async def execute(self, job: Any) -> dict[str, Any]:
        payload = job if isinstance(job, dict) else vars(job)

        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(
                f"{self.base_url}/v1/predictions",
                headers={
                    "Authorization": f"Key {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            return response.json()