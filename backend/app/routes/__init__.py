"""
backend/providers/__init__.py

Registers all built-in AI providers.
"""

from .openai_provider import OpenAIProvider
from .elevenlabs_provider import ElevenLabsProvider
from ai_provider_registry import AIProviderRegistry


def register_builtin_providers(
    registry: AIProviderRegistry,
) -> AIProviderRegistry:
    """
    Register all production providers.
    """

    registry.register("openai", OpenAIProvider())
    registry.register("elevenlabs", ElevenLabsProvider())

    return registry