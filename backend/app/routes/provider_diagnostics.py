"""
backend/app/routes/provider_diagnostics.py

Aggregated diagnostics endpoint for the AI provider subsystem.
"""

from __future__ import annotations

import inspect
from collections.abc import Mapping
from typing import Any

from fastapi import APIRouter, Depends

from backend.ai_provider_registry import AIProviderRegistry
from backend.app.dependencies.ai_providers import get_provider_registry

router = APIRouter(prefix="/api/providers", tags=["providers"])


async def _resolve(value: Any) -> Any:
    if callable(value):
        value = value()
    if inspect.isawaitable(value):
        value = await value
    return value


def _normalize(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, Mapping):
        return {str(key): _normalize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [_normalize(item) for item in value]
    return str(value)


@router.get("/diagnostics")
async def provider_diagnostics(
    registry: AIProviderRegistry = Depends(get_provider_registry),
) -> dict[str, Any]:
    providers: list[dict[str, Any]] = []

    for name in sorted(registry.list()):
        provider = registry.get(name)
        diagnostics: dict[str, Any] = {
            "name": name,
            "type": f"{type(provider).__module__}.{type(provider).__qualname__}",
        }

        for attribute in ("capabilities", "health", "metrics"):
            value = getattr(provider, attribute, None)
            if value is None:
                continue

            try:
                diagnostics[attribute] = _normalize(await _resolve(value))
            except Exception as exc:
                diagnostics[f"{attribute}_error"] = {
                    "type": type(exc).__name__,
                    "message": str(exc),
                }

        providers.append(diagnostics)

    return {
        "provider_count": len(providers),
        "providers": providers,
    }