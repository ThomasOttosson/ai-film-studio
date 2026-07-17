from __future__ import annotations

import asyncio
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


logger = logging.getLogger(__name__)


class AIProviderError(RuntimeError):
    """Base error for AI provider failures."""


class AIProviderConfigurationError(
    AIProviderError
):
    """Raised when required provider configuration is missing."""


class AIProviderTimeoutError(
    AIProviderError
):
    """Raised when a provider request exceeds its timeout."""


class AIProviderResponseError(
    AIProviderError
):
    """Raised when a provider returns an invalid result."""


@dataclass(frozen=True)
class AIProviderSettings:
    default_provider: str
    request_timeout_seconds: float
    max_retries: int
    retry_delay_seconds: float

    @classmethod
    def from_environment(
        cls,
    ) -> "AIProviderSettings":
        return cls(
            default_provider=os.getenv(
                "AI_DEFAULT_PROVIDER",
                "development",
            )
            .strip()
            .lower(),
            request_timeout_seconds=float(
                os.getenv(
                    "AI_PROVIDER_TIMEOUT_SECONDS",
                    "120",
                )
            ),
            max_retries=max(
                0,
                int(
                    os.getenv(
                        "AI_PROVIDER_MAX_RETRIES",
                        "2",
                    )
                ),
            ),
            retry_delay_seconds=max(
                0.0,
                float(
                    os.getenv(
                        "AI_PROVIDER_RETRY_DELAY_SECONDS",
                        "1.5",
                    )
                ),
            ),
        )


class AIProvider(ABC):
    """
    Base interface implemented by all AI providers.

    Each provider receives one normalized job dictionary and must return
    a result dictionary compatible with the frontend editor.
    """

    name: str

    @abstractmethod
    async def process(
        self,
        job: dict[str, Any],
    ) -> dict[str, Any]:
        raise NotImplementedError


class DevelopmentAIProvider(AIProvider):
    name = "development"

    async def process(
        self,
        job: dict[str, Any],
    ) -> dict[str, Any]:
        await asyncio.sleep(0.6)

        action = str(job["action"])
        clip = job.get("clip") or {}
        prompt = (
            job.get("prompt")
            or clip.get("prompt")
            or clip.get("narration")
            or ""
        )

        if action == "rewrite-narration":
            original = (
                clip.get("narration")
                or prompt
                or "Narration saknas."
            )

            return {
                "narration": (
                    f"{str(original).strip()} "
                    "Texten har bearbetats för ett tydligare "
                    "dramatiskt flöde och starkare filmiskt språk."
                ),
                "message": (
                    "Narrationen har skrivits om."
                ),
            }

        if action == "extend-scene":
            duration = float(
                clip.get("duration") or 5
            )
            extension = max(
                1.0,
                round(duration * 0.35, 1),
            )

            return {
                "duration": round(
                    duration + extension,
                    1,
                ),
                "message": (
                    f"Scenen förlängdes med "
                    f"{extension} sekunder."
                ),
            }

        if action == "generate-voiceover":
            return {
                "audioUrl": (
                    f"/generated/audio/"
                    f"{job['id']}.mp3"
                ),
                "message": (
                    "Voice-over har genererats."
                ),
            }

        if action == "clean-audio":
            return {
                "audioUrl": (
                    f"/generated/audio/"
                    f"{job['id']}-cleaned.mp3"
                ),
                "message": "Ljudet har rensats.",
            }

        if action in {
            "cinematic-motion",
            "change-style",
            "enhance-quality",
            "remove-background",
        }:
            extension = (
                "webm"
                if action == "remove-background"
                else "mp4"
            )

            return {
                "videoUrl": (
                    f"/generated/video/"
                    f"{job['id']}.{extension}"
                ),
                "prompt": prompt,
                "strength": job.get("strength"),
                "message": (
                    f"Åtgärden {action} är klar."
                ),
            }

        raise AIProviderResponseError(
            f"Unsupported AI action: {action}"
        )


class AIProviderRegistry:
    def __init__(
        self,
        settings: AIProviderSettings | None = None,
    ) -> None:
        self.settings = (
            settings
            or AIProviderSettings.from_environment()
        )
        self._providers: dict[
            str,
            AIProvider,
        ] = {}

    def register(
        self,
        provider: AIProvider,
    ) -> None:
        name = provider.name.strip().lower()

        if not name:
            raise ValueError(
                "Provider name cannot be empty"
            )

        self._providers[name] = provider

    def unregister(
        self,
        provider_name: str,
    ) -> None:
        self._providers.pop(
            provider_name.strip().lower(),
            None,
        )

    def available_providers(
        self,
    ) -> list[str]:
        return sorted(self._providers)

    def resolve(
        self,
        job: dict[str, Any],
    ) -> AIProvider:
        metadata = job.get("metadata") or {}
        provider_name = str(
            metadata.get("provider")
            or self.settings.default_provider
        ).strip().lower()

        provider = self._providers.get(
            provider_name
        )

        if provider is None:
            available = ", ".join(
                self.available_providers()
            ) or "none"

            raise AIProviderConfigurationError(
                f"AI provider '{provider_name}' "
                f"is not registered. Available: "
                f"{available}"
            )

        return provider

    async def process(
        self,
        job: dict[str, Any],
    ) -> dict[str, Any]:
        provider = self.resolve(job)
        attempts = (
            self.settings.max_retries + 1
        )
        last_error: Exception | None = None

        for attempt in range(1, attempts + 1):
            try:
                result = await asyncio.wait_for(
                    provider.process(job),
                    timeout=(
                        self.settings
                        .request_timeout_seconds
                    ),
                )

                self._validate_result(result)
                return result

            except asyncio.TimeoutError as error:
                last_error = AIProviderTimeoutError(
                    f"Provider '{provider.name}' "
                    f"timed out after "
                    f"{self.settings.request_timeout_seconds} "
                    f"seconds"
                )

                logger.warning(
                    "AI provider %s timed out "
                    "on attempt %s/%s",
                    provider.name,
                    attempt,
                    attempts,
                )

            except AIProviderConfigurationError:
                raise

            except Exception as error:
                last_error = error

                logger.exception(
                    "AI provider %s failed "
                    "on attempt %s/%s",
                    provider.name,
                    attempt,
                    attempts,
                )

            if attempt < attempts:
                delay = (
                    self.settings
                    .retry_delay_seconds
                    * attempt
                )

                if delay > 0:
                    await asyncio.sleep(delay)

        if isinstance(
            last_error,
            AIProviderError,
        ):
            raise last_error

        raise AIProviderError(
            str(last_error)
            if last_error
            else "AI provider failed"
        )

    @staticmethod
    def _validate_result(
        result: Any,
    ) -> None:
        if not isinstance(result, dict):
            raise AIProviderResponseError(
                "AI provider must return a dictionary"
            )

        if not result:
            raise AIProviderResponseError(
                "AI provider returned an empty result"
            )


provider_registry = AIProviderRegistry()
provider_registry.register(
    DevelopmentAIProvider()
)


async def process_with_provider(
    job: dict[str, Any],
) -> dict[str, Any]:
    return await provider_registry.process(job)