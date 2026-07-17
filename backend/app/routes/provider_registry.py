"""
backend/app/routes/provider_registry.py

Lists registered AI providers.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.ai_provider_registry import AIProviderRegistry
from backend.app.dependencies.ai_providers import get_provider_registry

router = APIRouter(prefix="/api/providers", tags=["providers"])


@router.get("/registry")
async def provider_registry(
    registry: AIProviderRegistry = Depends(get_provider_registry),
) -> dict[str, object]:
    names = sorted(registry.list())
    return {
        "count": len(names),
        "providers": [
            {
                "name": name,
                "registered": registry.has(name),
            }
            for name in names
        ],
    }