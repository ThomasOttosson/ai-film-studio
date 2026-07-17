"""
backend/providers/provider_circuit_breaker.py

Async circuit breaker for provider calls.
"""

from __future__ import annotations

import asyncio
import time
from enum import Enum


class State(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class ProviderCircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._failures = 0
        self._opened_at = 0.0
        self._state = State.CLOSED
        self._lock = asyncio.Lock()

    async def allow(self) -> bool:
        async with self._lock:
            if self._state is State.CLOSED:
                return True
            if self._state is State.OPEN:
                if time.monotonic() - self._opened_at >= self.recovery_timeout:
                    self._state = State.HALF_OPEN
                    return True
                return False
            return True

    async def success(self) -> None:
        async with self._lock:
            self._failures = 0
            self._state = State.CLOSED

    async def failure(self) -> None:
        async with self._lock:
            self._failures += 1
            if self._failures >= self.failure_threshold:
                self._state = State.OPEN
                self._opened_at = time.monotonic()
