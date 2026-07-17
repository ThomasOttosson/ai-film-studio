"""
backend/providers/provider_rate_limiter.py

Async token-bucket rate limiter for provider requests.
"""

from __future__ import annotations

import asyncio
import time


class ProviderRateLimiter:
    def __init__(self, rate: int, period: float = 1.0) -> None:
        self._rate = rate
        self._period = period
        self._tokens = float(rate)
        self._updated = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        while True:
            async with self._lock:
                now = time.monotonic()
                elapsed = now - self._updated
                self._updated = now
                self._tokens = min(
                    self._rate,
                    self._tokens + elapsed * (self._rate / self._period),
                )

                if self._tokens >= 1:
                    self._tokens -= 1
                    return

                wait = (1 - self._tokens) * (self._period / self._rate)

            await asyncio.sleep(wait)