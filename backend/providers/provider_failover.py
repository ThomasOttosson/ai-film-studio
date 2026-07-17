"""
backend/providers/provider_failover.py

Automatic failover between registered AI providers.
"""

from __future__ import annotations

from typing import Any, Iterable

from ai_provider_registry import AIProviderRegistry


class ProviderFailover:
    def __init__(self, registry: AIProviderRegistry) -> None:
        self._registry = registry

    async def execute(
        self,
        providers: Iterable[str],
        job: Any,
    ) -> Any:
        errors: dict[str, str] = {}

        for provider_name in providers:
            try:
                provider = self._registry.get(provider_name)
                return await provider.execute(job)
            except Exception as exc:
                errors[provider_name] = str(exc)

        raise RuntimeError(
            f"All providers failed: {errors}"
        )