"""
Global resolver for agent and tool resolution.
"""

from typing import Optional
from pathlib import Path
import os

from .local_resolver import LocalResolver


class GlobalResolver(LocalResolver):
    """Resolver for global registry (user-level)."""

    def __init__(self, registry_path: Optional[str] = None):
        """
        Initialize global resolver.

        Args:
            registry_path: Path to global registry directory
                          (default: ~/.forge or %USERPROFILE%/.forge)
        """
        if registry_path is None:
            home = Path.home()
            registry_path = str(home / ".forge")

        super().__init__(registry_path)

    def resolve(self, name: str, version: Optional[str] = None) -> Optional["ResolutionResult"]:
        """
        Resolve from global registry.

        Args:
            name: Name to resolve
            version: Optional version constraint

        Returns:
            ResolutionResult if found, None otherwise (with source='global')
        """
        result = super().resolve(name, version)
        if result:
            result.source = "global"
        return result
