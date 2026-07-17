"""
backend/providers/provider_tracing.py

Lightweight async tracing utilities for provider requests.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

logger = logging.getLogger("provider.tracing")


@asynccontextmanager
async def trace_provider_call(provider: str, operation: str) -> AsyncIterator[None]:
    start = time.perf_counter()
    logger.debug("provider=%s operation=%s started", provider, operation)
    try:
        yield
    except Exception:
        elapsed = (time.perf_counter() - start) * 1000
        logger.exception(
            "provider=%s operation=%s failed duration_ms=%.2f",
            provider,
            operation,
            elapsed,
        )
        raise
    else:
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(
            "provider=%s operation=%s completed duration_ms=%.2f",
            provider,
            operation,
            elapsed,
        )