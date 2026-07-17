"""
backend/providers/provider_router.py

Routes AI jobs to the correct provider implementation.
"""

from __future__ import annotations

from typing import Any

from ai_provider_registry import AIProviderRegistry


class ProviderRouter:
    def __init__(self, registry: AIProviderRegistry) -> None:
        self._registry = registry

    async def execute(self, provider: str, job: Any) -> Any:
        adapter = self._registry.get(provider)
        return await adapter.execute(job)