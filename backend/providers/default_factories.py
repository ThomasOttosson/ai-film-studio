"""
backend/providers/default_factories.py

Default provider factory mapping used by application startup.
"""

from __future__ import annotations

from collections.abc import Callable
from importlib import import_module
from typing import Any

from backend.providers.provider_bootstrap import ProviderFactory
from backend.providers.provider_settings import ProviderSettings


class ProviderFactoryImportError(RuntimeError):
    """Raised when a configured provider implementation cannot be imported."""


_PROVIDER_CLASSES: dict[str, tuple[str, str]] = {
    "openai": ("backend.providers.openai_provider", "OpenAIProvider"),
    "elevenlabs": (
        "backend.providers.elevenlabs_provider",
        "ElevenLabsProvider",
    ),
    "runway": ("backend.providers.runway_provider", "RunwayProvider"),
    "replicate": (
        "backend.providers.replicate_provider",
        "ReplicateProvider",
    ),
    "stability": (
        "backend.providers.stability_provider",
        "StabilityProvider",
    ),
    "fal": ("backend.providers.fal_provider", "FalProvider"),
    "pika": ("backend.providers.pika_provider", "PikaProvider"),
}

_PROVIDER_CREDENTIAL_ATTRIBUTES: dict[str, str] = {
    "openai": "openai_api_key",
    "elevenlabs": "elevenlabs_api_key",
    "runway": "runway_api_key",
    "replicate": "replicate_api_token",
    "stability": "stability_api_key",
    "fal": "fal_key",
    "pika": "pika_api_key",
}


def _load_provider_class(provider_name: str) -> type[Any]:
    try:
        module_name, class_name = _PROVIDER_CLASSES[provider_name]
    except KeyError as exc:
        raise ValueError(f"Unsupported provider: {provider_name}") from exc

    try:
        module = import_module(module_name)
        provider_class = getattr(module, class_name)
    except (ImportError, AttributeError) as exc:
        raise ProviderFactoryImportError(
            f"Could not load {class_name} from {module_name}"
        ) from exc

    if not isinstance(provider_class, type):
        raise ProviderFactoryImportError(
            f"{module_name}.{class_name} is not a class"
        )

    return provider_class


def _create_provider(
    provider_name: str,
    settings: ProviderSettings,
) -> object:
    provider_class = _load_provider_class(provider_name)
    credential_attribute = _PROVIDER_CREDENTIAL_ATTRIBUTES[provider_name]
    credential = getattr(settings, credential_attribute)

    if not credential:
        raise ValueError(
            f"Missing credential for provider {provider_name!r}"
        )

    keyword_candidates: tuple[dict[str, Any], ...] = (
        {
            "api_key": credential,
            "timeout_seconds": settings.request_timeout_seconds,
        },
        {"api_token": credential},
        {"api_key": credential},
        {"token": credential},
        {"key": credential},
    )

    last_error: TypeError | None = None
    for kwargs in keyword_candidates:
        try:
            return provider_class(**kwargs)
        except TypeError as exc:
            last_error = exc

    raise TypeError(
        f"Unable to construct provider {provider_name!r} using its "
        "supported credential arguments"
    ) from last_error


def build_default_provider_factories() -> dict[str, ProviderFactory]:
    """
    Return lazy factories for every built-in provider.

    Provider modules are imported only when their factory is invoked, keeping
    optional SDK dependencies isolated to enabled providers.
    """
    factories: dict[str, ProviderFactory] = {}

    for provider_name in _PROVIDER_CLASSES:
        def factory(
            settings: ProviderSettings,
            *,
            _provider_name: str = provider_name,
        ) -> object:
            return _create_provider(_provider_name, settings)

        factories[provider_name] = factory

    return factories