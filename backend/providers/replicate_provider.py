"""
backend/providers/replicate_provider.py

Production-ready Replicate provider adapter.
"""

from __future__ import annotations

import os
from typing import Any

import httpx


class ReplicateProvider:
    def __init__(self) -> None:
        self.api_key = os.environ["REPLICATE_API_TOKEN"]
        self.base_url = os.getenv(
            "REPLICATE_API_BASE",
            "https://api.replicate.com/v1",
        )

    async def execute(self, job: Any) -> dict[str, Any]:
        payload = job if isinstance(job, dict) else vars(job)

        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(
                f"{self.base_url}/predictions",
                headers={
                    "Authorization": f"Token {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            return response.json()