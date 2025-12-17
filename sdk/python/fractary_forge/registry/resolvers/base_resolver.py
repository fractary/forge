"""
Base resolver class for agent and tool resolution.
"""

from abc import ABC, abstractmethod
from typing import Optional
from pathlib import Path

from ...types import ResolutionResult
from ...errors import ResolutionError
from ...logger import get_logger


class BaseResolver(ABC):
    """Base class for resolvers."""

    def __init__(self, registry_path: Optional[str] = None):
        """
        Initialize resolver.

        Args:
            registry_path: Path to registry directory
        """
        self.registry_path = Path(registry_path) if registry_path else None
        self.logger = get_logger()

    @abstractmethod
    def resolve(self, name: str, version: Optional[str] = None) -> Optional[ResolutionResult]:
        """
        Resolve an agent or tool.

        Args:
            name: Name to resolve
            version: Optional version constraint

        Returns:
            ResolutionResult if found, None otherwise

        Raises:
            ResolutionError: If resolution fails
        """
        pass

    @abstractmethod
    def list_all(self) -> list[ResolutionResult]:
        """
        List all available items in this registry.

        Returns:
            List of resolution results
        """
        pass

    def _parse_name_version(self, name: str) -> tuple[str, Optional[str]]:
        """
        Parse name and version from string like 'name@version'.

        Args:
            name: Name string (e.g., 'agent@1.0.0' or 'agent')

        Returns:
            Tuple of (name, version)
        """
        if "@" in name:
            parts = name.split("@", 1)
            return parts[0], parts[1]
        return name, None

    def _match_version(self, available: str, requested: Optional[str]) -> bool:
        """
        Check if available version matches requested version.

        Args:
            available: Available version string
            requested: Requested version constraint

        Returns:
            True if match, False otherwise
        """
        if not requested:
            return True

        # Simple exact match for now
        # TODO: Implement semver matching
        return available == requested
