"""
backend/providers/provider_registry_loader.py

Auto-registers available provider implementations with the central registry.
"""

from __future__ import annotations

from collections.abc import Iterable

from backend.ai_provider_registry import AIProviderRegistry


def load_providers(
    registry: AIProviderRegistry,
    providers: Iterable[object],
) -> None:
    """
    Register all provider instances that expose a unique `name` attribute.
    """
    for provider in providers:
        name = getattr(provider, "name", None)
        if not name:
            raise ValueError(f"Provider {provider!r} is missing a 'name' attribute")
        registry.register(name, provider)