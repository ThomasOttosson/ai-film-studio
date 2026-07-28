"""Bounded, jittered retry for transient provider failures.

Retries only what the caller classifies as transient (timeouts, HTTP 429, 5xx).
Content-filter rejections, auth failures, and quota-exhausted errors are never
retried — they never succeed and would waste money.
"""

from __future__ import annotations

import logging
import random
import time
from typing import Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

DEFAULT_ATTEMPTS = 3
BASE_DELAY_SECONDS = 0.5
MAX_DELAY_SECONDS = 8.0


def retry_transient(
    fn: Callable[[], T],
    *,
    is_retryable: Callable[[BaseException], bool],
    attempts: int = DEFAULT_ATTEMPTS,
    base_delay: float = BASE_DELAY_SECONDS,
    max_delay: float = MAX_DELAY_SECONDS,
    label: str = "provider call",
    sleep: Callable[[float], None] = time.sleep,
    rng: Callable[[], float] = random.random,
) -> T:
    """Call ``fn`` with up to ``attempts`` tries, backing off between retries.

    A raised exception is retried only while ``is_retryable(exc)`` is true and
    attempts remain; otherwise it propagates unchanged. Backoff is exponential
    (``base_delay * 2**n``, capped at ``max_delay``) with 0.5x–1.5x jitter.
    ``sleep``/``rng`` are injectable so tests run without real delays.
    """
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except Exception as exc:
            if attempt >= attempts or not is_retryable(exc):
                raise
            backoff = min(max_delay, base_delay * (2 ** (attempt - 1)))
            delay = backoff * (0.5 + rng())  # jitter: 0.5x–1.5x
            logger.warning(
                "%s failed on attempt %d/%d (%s); retrying in %.2fs",
                label,
                attempt,
                attempts,
                exc,
                delay,
            )
            sleep(delay)
    # Unreachable: the loop either returns or raises.
    raise RuntimeError("retry_transient exhausted without returning")
