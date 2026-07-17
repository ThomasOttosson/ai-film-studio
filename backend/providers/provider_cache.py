"""
backend/providers/provider_cache.py

Simple async in-memory cache with TTL support.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any


class ProviderCache:
    def __init__(self, default_ttl: float = 300.0) -> None:
        self._default_ttl = default_ttl
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            item = self._store.get(key)
            if item is None:
                return None
            expires_at, value = item
            if expires_at < time.monotonic():
                self._store.pop(key, None)
                return None
            return value

    async def set(self, key: str, value: Any, ttl: float | None = None) -> None:
        async with self._lock:
            self._store[key] = (
                time.monotonic() + (ttl if ttl is not None else self._default_ttl),
                value,
            )

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def clear(self) -> None:
        async with self._lock:
            self._store.clear()