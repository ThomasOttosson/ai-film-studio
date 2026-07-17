"""
backend/ai_provider_service.py

Singleton access to the application's provider registry.
"""

from __future__ import annotations

from threading import Lock

from backend.providers.factory import create_provider_registry
from ai_provider_registry import AIProviderRegistry


_registry: AIProviderRegistry | None = None
_lock = Lock()


def get_provider_registry() -> AIProviderRegistry:
    global _registry

    if _registry is None:
        with _lock:
            if _registry is None:
                _registry = create_provider_registry()

    return _registry


def reset_provider_registry() -> None:
    global _registry
    with _lock:
        _registry = None