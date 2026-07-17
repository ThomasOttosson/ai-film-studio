"""
backend/providers/provider_timeout.py

Async timeout helper for provider operations.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable
from typing import TypeVar

T = TypeVar("T")


class ProviderTimeoutError(asyncio.TimeoutError):
    """Raised when a provider call exceeds its timeout."""


async def run_with_timeout(
    operation: Awaitable[T],
    timeout: float,
) -> T:
    try:
        return await asyncio.wait_for(operation, timeout=timeout)
    except asyncio.TimeoutError as exc:
        raise ProviderTimeoutError(
            f"Provider operation exceeded {timeout:.2f}s timeout"
        ) from exc