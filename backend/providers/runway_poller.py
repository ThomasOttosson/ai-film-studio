"""
backend/providers/runway_poller.py

Polls asynchronous Runway jobs until completion.
"""

from __future__ import annotations

import asyncio
import os

from .polling import ProviderPollingClient


class RunwayPoller:
    def __init__(self) -> None:
        api_key = os.getenv("RUNWAY_API_KEY")
        if not api_key:
            raise RuntimeError("RUNWAY_API_KEY is not configured")

        base_url = os.getenv(
            "RUNWAY_API_BASE",
            "https://api.runwayml.com/v1",
        )

        self.client = ProviderPollingClient(api_key, base_url)

    async def wait_for_completion(
        self,
        provider_job_id: str,
        poll_interval: float = 5.0,
    ) -> dict:
        while True:
            job = await self.client.get_job(provider_job_id)

            if self.client.is_finished(job):
                return job

            await asyncio.sleep(poll_interval)
