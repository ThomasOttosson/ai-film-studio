"""
backend/providers/provider_retry.py

Async retry helper with exponential backoff.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")


class RetryError(RuntimeError):
    """Raised when all retry attempts have failed."""


async def retry(
    operation: Callable[[], Awaitable[T]],
    *,
    attempts: int = 3,
    initial_delay: float = 0.5,
    backoff_factor: float = 2.0,
    retry_exceptions: tuple[type[Exception], ...] = (Exception,),
) -> T:
    delay = initial_delay
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            return await operation()
        except retry_exceptions as exc:
            last_error = exc
            if attempt >= attempts:
                break
            await asyncio.sleep(delay)
            delay *= backoff_factor

    raise RetryError("Operation failed after maximum retry attempts") from last_error