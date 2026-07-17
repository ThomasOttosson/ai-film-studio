"""
backend/providers/provider_bootstrap.py

Creates and validates the AI provider registry during application startup.
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Iterable
from typing import Any, Protocol, TypeVar

from backend.ai_provider_registry import AIProviderRegistry
from backend.providers.provider_config_validator import validate_provider_settings
from backend.providers.provider_registry_loader import load_providers
from backend.providers.provider_settings import ProviderSettings

logger = logging.getLogger(__name__)

ProviderT = TypeVar("ProviderT")


class ProviderFactory(Protocol):
    def __call__(self, settings: ProviderSettings) -> object:
        """Create a configured provider instance."""


def bootstrap_provider_registry(
    *,
    factories: dict[str, ProviderFactory],
    enabled_providers: Iterable[str],
    settings: ProviderSettings | None = None,
    registry_factory: Callable[[], AIProviderRegistry] = AIProviderRegistry,
) -> AIProviderRegistry:
    """
    Build a validated provider registry.

    Provider instances are created only after all enabled provider names and
    required credentials have been validated.
    """
    resolved_settings = settings or ProviderSettings.from_env()
    enabled = set(enabled_providers)

    unknown_factories = enabled.difference(factories)
    if unknown_factories:
        raise ValueError(
            "No provider factory configured for: "
            + ", ".join(sorted(unknown_factories))
        )

    validate_provider_settings(resolved_settings, enabled)

    providers: list[object] = []
    for provider_name in sorted(enabled):
        try:
            provider = factories[provider_name](resolved_settings)
        except Exception:
            logger.exception("Failed to initialize provider %s", provider_name)
            raise

        actual_name = getattr(provider, "name", None)
        if actual_name != provider_name:
            raise ValueError(
                f"Factory for {provider_name!r} returned provider named "
                f"{actual_name!r}"
            )

        providers.append(provider)

    registry = registry_factory()
    load_providers(registry, providers)

    logger.info(
        "Initialized AI provider registry with providers: %s",
        ", ".join(sorted(enabled)) or "none",
    )
    return registry