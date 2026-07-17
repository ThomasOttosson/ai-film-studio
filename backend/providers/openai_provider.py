"""
backend/providers/openai_provider.py
"""

from __future__ import annotations

import os
from typing import Any

from openai import AsyncOpenAI


class OpenAIProvider:
    """
    Generic provider adapter used by AIActionProcessor.
    """

    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        self.client = AsyncOpenAI(api_key=api_key)

    async def execute(self, job: Any) -> dict[str, Any]:
        action = getattr(job, "action", None)
        payload = getattr(job, "payload", {})

        if isinstance(job, dict):
            action = job.get("action")
            payload = job.get("payload", {})

        if action == "chat":
            response = await self.client.responses.create(
                model=payload.get("model", "gpt-4.1"),
                input=payload["input"],
            )

            return {
                "provider": "openai",
                "action": action,
                "output": response.output_text,
                "response_id": response.id,
            }

        if action == "embeddings":
            response = await self.client.embeddings.create(
                model=payload.get("model", "text-embedding-3-large"),
                input=payload["input"],
            )

            return {
                "provider": "openai",
                "action": action,
                "embedding": response.data[0].embedding,
            }

        raise NotImplementedError(
            f"Unsupported OpenAI action: {action}"
        )
