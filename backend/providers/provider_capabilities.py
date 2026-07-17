"""
backend/providers/provider_capabilities.py

Provider capability registry helpers.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True, frozen=True)
class ProviderCapabilities:
    text: bool = False
    image: bool = False
    video: bool = False
    audio: bool = False
    streaming: bool = False
    batch: bool = False
    metadata: dict[str, str] = field(default_factory=dict)


_CAPABILITIES: dict[str, ProviderCapabilities] = {}


def register_capabilities(provider: str, capabilities: ProviderCapabilities) -> None:
    _CAPABILITIES[provider] = capabilities


def get_capabilities(provider: str) -> ProviderCapabilities | None:
    return _CAPABILITIES.get(provider)


def supports(provider: str, capability: str) -> bool:
    caps = _CAPABILITIES.get(provider)
    return bool(caps and getattr(caps, capability, False))