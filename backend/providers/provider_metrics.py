"""
backend/providers/provider_metrics.py

Simple in-memory metrics for provider executions.
"""

from __future__ import annotations

from collections import defaultdict
from threading import Lock
from time import perf_counter
from typing import Any


class ProviderMetrics:
    def __init__(self) -> None:
        self._lock = Lock()
        self._stats: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "calls": 0,
                "success": 0,
                "failed": 0,
                "total_latency_ms": 0.0,
            }
        )

    def record(self, provider: str, latency_ms: float, success: bool) -> None:
        with self._lock:
            s = self._stats[provider]
            s["calls"] += 1
            s["total_latency_ms"] += latency_ms
            if success:
                s["success"] += 1
            else:
                s["failed"] += 1

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            out = {}
            for name, s in self._stats.items():
                avg = s["total_latency_ms"] / s["calls"] if s["calls"] else 0.0
                out[name] = {
                    **s,
                    "avg_latency_ms": round(avg, 2),
                }
            return out


class ProviderTimer:
    def __init__(self, metrics: ProviderMetrics, provider: str):
        self.metrics = metrics
        self.provider = provider

    async def __aenter__(self):
        self._start = perf_counter()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        latency = (perf_counter() - self._start) * 1000
        self.metrics.record(self.provider, latency, exc is None)
        return False