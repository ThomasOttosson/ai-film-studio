"""
backend/app/dependencies/ai_providers.py

Application-scoped dependency management for the AI provider registry.
"""

from __future__ import annotations

from threading import RLock
from typing import Final

from backend.ai_provider_registry import AIProviderRegistry

_LOCK: Final = RLock()
_registry: AIProviderRegistry | None = None


class ProviderRegistryNotInitializedError(RuntimeError):
    """Raised when the provider registry is requested before startup."""


def set_provider_registry(registry: AIProviderRegistry) -> None:
    """
    Install the application-scoped provider registry.

    This should be called once during application startup after provider
    configuration has been validated and provider instances have been loaded.
    """
    if registry is None:
        raise TypeError("registry cannot be None")

    global _registry
    with _LOCK:
        if _registry is not None and _registry is not registry:
            raise RuntimeError("AI provider registry is already initialized")
        _registry = registry


def get_provider_registry() -> AIProviderRegistry:
    """Return the initialized application-scoped provider registry."""
    with _LOCK:
        registry = _registry

    if registry is None:
        raise ProviderRegistryNotInitializedError(
            "AI provider registry has not been initialized"
        )

    return registry


def clear_provider_registry() -> None:
    """
    Remove the application-scoped registry.

    Intended for graceful shutdown and isolated automated tests.
    """
    global _registry
    with _LOCK:
        _registry = None