"""
backend/providers/pika_provider.py

Production-ready Pika provider adapter.
"""

from __future__ import annotations

import os
from typing import Any

import httpx


class PikaProvider:
    def __init__(self) -> None:
        self.api_key = os.environ["PIKA_API_KEY"]
        self.base_url = os.getenv("PIKA_API_BASE", "https://api.pika.art")

    async def execute(self, job: Any) -> dict[str, Any]:
        payload = job if isinstance(job, dict) else vars(job)

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{self.base_url}/v1/generations",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            return response.json()