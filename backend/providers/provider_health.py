"""
backend/providers/provider_health.py

Health checks for registered AI providers.
"""

from __future__ import annotations

from typing import Any

from ai_provider_registry import AIProviderRegistry


class ProviderHealthService:
    def __init__(self, registry: AIProviderRegistry) -> None:
        self._registry = registry

    async def check(self) -> dict[str, Any]:
        status: dict[str, Any] = {}

        for name in self._registry.list():
            try:
                self._registry.get(name)
                status[name] = {
                    "healthy": True,
                    "message": "registered",
                }
            except Exception as exc:
                status[name] = {
                    "healthy": False,
                    "message": str(exc),
                }

        return {
            "healthy": all(v["healthy"] for v in status.values()),
            "providers": status,
        }