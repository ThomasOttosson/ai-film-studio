"""
backend/app/lifespan.py

FastAPI lifespan integration for AI provider startup and shutdown.
"""

from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator, Mapping
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.app.dependencies.ai_providers import (
    clear_provider_registry,
    set_provider_registry,
)
from backend.providers.provider_bootstrap import (
    ProviderFactory,
    bootstrap_provider_registry,
)
from backend.providers.provider_settings import ProviderSettings

logger = logging.getLogger(__name__)

_PROVIDER_FACTORIES_STATE_KEY = "ai_provider_factories"
_ENABLED_PROVIDERS_ENV = "AI_ENABLED_PROVIDERS"


def parse_enabled_providers(value: str | None) -> set[str]:
    """Parse a comma-separated provider list from configuration."""
    if not value:
        return set()

    providers = {
        item.strip().lower()
        for item in value.split(",")
        if item.strip()
    }

    invalid = {
        provider
        for provider in providers
        if not provider.replace("_", "").replace("-", "").isalnum()
    }
    if invalid:
        raise ValueError(
            "Invalid provider names: " + ", ".join(sorted(invalid))
        )

    return providers


def configure_provider_factories(
    app: FastAPI,
    factories: Mapping[str, ProviderFactory],
) -> None:
    """
    Attach provider factories to the FastAPI application.

    Call this during application construction, before the lifespan starts.
    """
    normalized: dict[str, ProviderFactory] = {}

    for name, factory in factories.items():
        provider_name = name.strip().lower()
        if not provider_name:
            raise ValueError("Provider factory names cannot be empty")
        if provider_name in normalized:
            raise ValueError(
                f"Duplicate provider factory: {provider_name}"
            )
        if not callable(factory):
            raise TypeError(
                f"Provider factory for {provider_name!r} is not callable"
            )
        normalized[provider_name] = factory

    setattr(app.state, _PROVIDER_FACTORIES_STATE_KEY, normalized)


def _get_provider_factories(app: FastAPI) -> dict[str, ProviderFactory]:
    factories = getattr(
        app.state,
        _PROVIDER_FACTORIES_STATE_KEY,
        None,
    )
    if factories is None:
        raise RuntimeError(
            "Provider factories have not been configured on the application"
        )
    return dict(factories)


@asynccontextmanager
async def ai_provider_lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize the AI provider registry and clean it up on shutdown."""
    factories = _get_provider_factories(app)
    enabled = parse_enabled_providers(
        os.getenv(_ENABLED_PROVIDERS_ENV)
    )
    settings = ProviderSettings.from_env()

    registry = bootstrap_provider_registry(
        factories=factories,
        enabled_providers=enabled,
        settings=settings,
    )
    set_provider_registry(registry)
    app.state.ai_provider_registry = registry

    logger.info(
        "AI provider subsystem started with %d provider(s)",
        len(enabled),
    )

    try:
        yield
    finally:
        clear_provider_registry()

        if hasattr(app.state, "ai_provider_registry"):
            delattr(app.state, "ai_provider_registry")

        logger.info("AI provider subsystem stopped")