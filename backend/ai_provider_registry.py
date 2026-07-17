"""
backend/ai_provider_registry.py

Central registry for AI providers.
"""

from __future__ import annotations

from typing import Any, Protocol


class AIProvider(Protocol):
    async def execute(self, job: Any) -> Any:
        ...


class AIProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, AIProvider] = {}

    def register(self, name: str, provider: AIProvider) -> None:
        key = name.strip().lower()
        if key in self._providers:
            raise ValueError(f"Provider already registered: {key}")
        self._providers[key] = provider

    def unregister(self, name: str) -> None:
        self._providers.pop(name.strip().lower(), None)

    def get(self, name: str) -> AIProvider:
        key = name.strip().lower()
        try:
            return self._providers[key]
        except KeyError as exc:
            raise LookupError(f"No AI provider registered for '{key}'") from exc

    def has(self, name: str) -> bool:
        return name.strip().lower() in self._providers

    def list(self) -> list[str]:
        return sorted(self._providers.keys())
