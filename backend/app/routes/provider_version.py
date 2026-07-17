"""
backend/app/routes/provider_version.py

Exposes version information for the provider subsystem.
"""

from __future__ import annotations

from fastapi import APIRouter

try:
    from backend import __version__ as backend_version
except Exception:
    backend_version = "unknown"

router = APIRouter(prefix="/api/providers", tags=["providers"])


@router.get("/version")
async def provider_version() -> dict[str, str]:
    return {
        "backend_version": backend_version,
        "provider_api_version": "1.0",
    }