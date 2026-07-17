"""
backend/app/routes/provider_readiness.py

Readiness endpoint for the AI provider subsystem.
"""

from __future__ import annotations

import inspect
from collections.abc import Mapping
from typing import Any

from fastapi import APIRouter, Depends, Response, status

from backend.ai_provider_registry import AIProviderRegistry
from backend.app.dependencies.ai_providers import get_provider_registry

router = APIRouter(prefix="/api/providers", tags=["providers"])


async def _is_ready(provider: object) -> tuple[bool, str | None]:
    readiness_check = getattr(provider, "readiness_check", None)
    if readiness_check is None:
        readiness_check = getattr(provider, "health_check", None)

    if readiness_check is None:
        return True, None

    try:
        result = readiness_check()
        if inspect.isawaitable(result):
            result = await result
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"

    if isinstance(result, Mapping):
        ready = bool(
            result.get(
                "ready",
                result.get("healthy", result.get("ok", False)),
            )
        )
        detail = result.get("detail") or result.get("message")
        return ready, str(detail) if detail is not None else None

    return bool(result), None


@router.get("/readiness")
async def provider_readiness(
    response: Response,
    registry: AIProviderRegistry = Depends(get_provider_registry),
) -> dict[str, Any]:
    provider_names = sorted(registry.list())
    providers: list[dict[str, Any]] = []

    for name in provider_names:
        ready, detail = await _is_ready(registry.get(name))
        item: dict[str, Any] = {
            "name": name,
            "ready": ready,
        }
        if detail is not None:
            item["detail"] = detail
        providers.append(item)

    ready_count = sum(1 for provider in providers if provider["ready"])
    all_ready = bool(providers) and ready_count == len(providers)

    if not all_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if all_ready else "not_ready",
        "provider_count": len(providers),
        "ready_count": ready_count,
        "providers": providers,
    }