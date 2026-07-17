"""
backend/providers/provider_config_validator.py

Validates provider configuration at application startup.
"""

from __future__ import annotations

from dataclasses import dataclass

from backend.providers.provider_settings import ProviderSettings


@dataclass(frozen=True, slots=True)
class ProviderConfigIssue:
    provider: str
    environment_variable: str
    message: str


class ProviderConfigurationError(RuntimeError):
    def __init__(self, issues: list[ProviderConfigIssue]) -> None:
        self.issues = tuple(issues)
        details = "; ".join(
            f"{issue.provider}: {issue.message} ({issue.environment_variable})"
            for issue in issues
        )
        super().__init__(f"Invalid provider configuration: {details}")


_PROVIDER_KEYS: dict[str, tuple[str, str]] = {
    "openai": ("openai_api_key", "OPENAI_API_KEY"),
    "elevenlabs": ("elevenlabs_api_key", "ELEVENLABS_API_KEY"),
    "runway": ("runway_api_key", "RUNWAY_API_KEY"),
    "replicate": ("replicate_api_token", "REPLICATE_API_TOKEN"),
    "stability": ("stability_api_key", "STABILITY_API_KEY"),
    "fal": ("fal_key", "FAL_KEY"),
    "pika": ("pika_api_key", "PIKA_API_KEY"),
}


def validate_provider_settings(
    settings: ProviderSettings,
    enabled_providers: set[str],
) -> None:
    unknown = enabled_providers.difference(_PROVIDER_KEYS)
    if unknown:
        raise ValueError(
            "Unknown providers: " + ", ".join(sorted(unknown))
        )

    issues: list[ProviderConfigIssue] = []

    for provider in sorted(enabled_providers):
        attribute, environment_variable = _PROVIDER_KEYS[provider]
        value = getattr(settings, attribute)

        if not value or not value.strip():
            issues.append(
                ProviderConfigIssue(
                    provider=provider,
                    environment_variable=environment_variable,
                    message="missing required credential",
                )
            )

    if settings.request_timeout_seconds <= 0:
        issues.append(
            ProviderConfigIssue(
                provider="global",
                environment_variable="AI_PROVIDER_REQUEST_TIMEOUT_SECONDS",
                message="must be greater than zero",
            )
        )

    if settings.max_concurrent_requests < 1:
        issues.append(
            ProviderConfigIssue(
                provider="global",
                environment_variable="AI_PROVIDER_MAX_CONCURRENT_REQUESTS",
                message="must be at least one",
            )
        )

    if settings.max_retries < 0:
        issues.append(
            ProviderConfigIssue(
                provider="global",
                environment_variable="AI_PROVIDER_MAX_RETRIES",
                message="cannot be negative",
            )
        )

    if issues:
        raise ProviderConfigurationError(issues)