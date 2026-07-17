"""
backend/providers/provider_request_context.py

Per-request context helpers for provider executions.
"""

from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ProviderRequestContext:
    request_id: str
    provider: str
    metadata: dict[str, Any] = field(default_factory=dict)


_current: ContextVar[ProviderRequestContext | None] = ContextVar(
    "provider_request_context",
    default=None,
)


def set_context(ctx: ProviderRequestContext):
    return _current.set(ctx)


def get_context() -> ProviderRequestContext | None:
    return _current.get()


def reset_context(token) -> None:
    _current.reset(token)