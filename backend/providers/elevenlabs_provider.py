"""
backend/providers/elevenlabs_provider.py
"""

from __future__ import annotations

import os
from typing import Any

from elevenlabs.client import AsyncElevenLabs


class ElevenLabsProvider:
    """Speech synthesis provider."""

    def __init__(self) -> None:
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise RuntimeError("ELEVENLABS_API_KEY is not configured")
        self.client = AsyncElevenLabs(api_key=api_key)

    async def execute(self, job: Any) -> dict[str, Any]:
        action = getattr(job, "action", None)
        payload = getattr(job, "payload", {})
        if isinstance(job, dict):
            action = job.get("action")
            payload = job.get("payload", {})

        if action != "text_to_speech":
            raise NotImplementedError(f"Unsupported ElevenLabs action: {action}")

        audio = await self.client.text_to_speech.convert(
            voice_id=payload["voice_id"],
            model_id=payload.get("model", "eleven_multilingual_v2"),
            text=payload["text"],
        )

        chunks = bytearray()
        async for chunk in audio:
            chunks.extend(chunk)

        return {
            "provider": "elevenlabs",
            "action": action,
            "mime_type": "audio/mpeg",
            "audio": bytes(chunks),
        }
