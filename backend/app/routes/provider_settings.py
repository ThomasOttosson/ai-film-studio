"""
backend/providers/provider_settings.py

Environment-backed configuration for AI provider integrations.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc


def _get_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a number") from exc


@dataclass(frozen=True, slots=True)
class ProviderSettings:
    openai_api_key: str | None
    elevenlabs_api_key: str | None
    runway_api_key: str | None
    replicate_api_token: str | None
    stability_api_key: str | None
    fal_key: str | None
    pika_api_key: str | None
    request_timeout_seconds: float
    max_concurrent_requests: int
    max_retries: int

    @classmethod
    def from_env(cls) -> "ProviderSettings":
        return cls(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY"),
            runway_api_key=os.getenv("RUNWAY_API_KEY"),
            replicate_api_token=os.getenv("REPLICATE_API_TOKEN"),
            stability_api_key=os.getenv("STABILITY_API_KEY"),
            fal_key=os.getenv("FAL_KEY"),
            pika_api_key=os.getenv("PIKA_API_KEY"),
            request_timeout_seconds=_get_float(
                "AI_PROVIDER_REQUEST_TIMEOUT_SECONDS",
                120.0,
            ),
            max_concurrent_requests=_get_int(
                "AI_PROVIDER_MAX_CONCURRENT_REQUESTS",
                10,
            ),
            max_retries=_get_int("AI_PROVIDER_MAX_RETRIES", 3),
        )
