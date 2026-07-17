"""
backend/providers/provider_idempotency.py

Idempotency helper for provider requests.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
from typing import Any


class ProviderIdempotencyStore:
    def __init__(self) -> None:
        self._results: dict[str, Any] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def make_key(provider: str, payload: dict[str, Any]) -> str:
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
        return f"{provider}:{digest}"

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            return self._results.get(key)

    async def set(self, key: str, result: Any) -> None:
        async with self._lock:
            self._results[key] = result

    async def clear(self) -> None:
        async with self._lock:
            self._results.clear()