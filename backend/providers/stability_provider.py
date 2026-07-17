"""
backend/providers/stability_provider.py

Production-ready Stability AI provider adapter.
"""

from __future__ import annotations

import os
from typing import Any

import httpx


class StabilityProvider:
    def __init__(self) -> None:
        self.api_key = os.environ["STABILITY_API_KEY"]
        self.base_url = os.getenv(
            "STABILITY_API_BASE",
            "https://api.stability.ai",
        )

    async def execute(self, job: Any) -> dict[str, Any]:
        payload = job if isinstance(job, dict) else vars(job)

        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(
                f"{self.base_url}/v2beta/stable-image/generate/core",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            return response.json()