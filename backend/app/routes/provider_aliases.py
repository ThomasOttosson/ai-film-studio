"""
backend/providers/provider_aliases.py

Alias registry for resolving logical provider names to canonical providers.
"""

from __future__ import annotations


_ALIASES: dict[str, str] = {}


def register_alias(alias: str, provider: str) -> None:
    """Register an alias for a provider."""
    _ALIASES[alias] = provider


def resolve_provider(name: str) -> str:
    """Resolve an alias to its canonical provider name."""
    return _ALIASES.get(name, name)


def remove_alias(alias: str) -> None:
    """Remove an existing alias."""
    _ALIASES.pop(alias, None)


def list_aliases() -> dict[str, str]:
    """Return all registered aliases."""
    return dict(_ALIASES)