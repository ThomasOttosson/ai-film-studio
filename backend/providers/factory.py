"""
backend/providers/factory.py

Creates and configures the provider registry.
"""

from ai_provider_registry import AIProviderRegistry
from . import register_builtin_providers


def create_provider_registry() -> AIProviderRegistry:
    registry = AIProviderRegistry()
    register_builtin_providers(registry)
    return registry