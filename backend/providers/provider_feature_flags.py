"""
backend/providers/provider_feature_flags.py

Feature flag registry for provider-specific functionality.
"""

from __future__ import annotations

from collections.abc import Mapping


_FLAGS: dict[str, dict[str, bool]] = {}


def register_flags(provider: str, flags: Mapping[str, bool]) -> None:
    _FLAGS[provider] = dict(flags)


def is_enabled(provider: str, flag: str) -> bool:
    return _FLAGS.get(provider, {}).get(flag, False)


def get_flags(provider: str) -> dict[str, bool]:
    return dict(_FLAGS.get(provider, {}))