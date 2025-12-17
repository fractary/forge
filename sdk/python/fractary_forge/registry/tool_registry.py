"""
Tool registry for resolving and managing tools.
"""

from typing import Optional
from pathlib import Path

from .resolvers import LocalResolver, GlobalResolver, RemoteResolver
from ..types import ResolutionResult, ToolConfig
from ..errors import ToolNotFoundError, ResolutionError
from ..logger import get_logger


class ToolRegistry:
    """Registry for resolving tools across local, global, and remote registries."""

    def __init__(self, config: Optional[ToolConfig] = None):
        """
        Initialize tool registry.

        Args:
            config: Configuration for registry behavior
        """
        self.config = config or ToolConfig()
        self.logger = get_logger()

        # Initialize resolvers
        self.local_resolver = LocalResolver(self.config.local_registry_path)
        self.global_resolver = GlobalResolver(self.config.global_registry_path)
        self.remote_resolver = RemoteResolver(self.config.remote_registry_url)

    def tool_resolve(
        self,
        name: str,
        version: Optional[str] = None,
        prefer_local: bool = True,
    ) -> ResolutionResult:
        """
        Resolve a tool using three-tier resolution (local → global → remote).

        Args:
            name: Tool name (e.g., 'my-tool' or 'my-tool@1.0.0')
            version: Optional version constraint
            prefer_local: If True, prefer local/global over remote

        Returns:
            ResolutionResult with tool location and metadata

        Raises:
            ToolNotFoundError: If tool cannot be found
        """
        self.logger.debug(f"Resolving tool: {name} (version: {version})")

        # Try local first
        result = self.local_resolver.resolve(name, version)
        if result:
            self.logger.info(f"Resolved tool '{name}' from local registry")
            return result

        # Try global
        result = self.global_resolver.resolve(name, version)
        if result:
            self.logger.info(f"Resolved tool '{name}' from global registry")
            return result

        # Try remote
        if self.config.remote_registry_url:
            try:
                result = self.remote_resolver.resolve(name, version)
                if result:
                    self.logger.info(f"Resolved tool '{name}' from remote registry")
                    return result
            except Exception as e:
                self.logger.warning(f"Failed to resolve from remote registry: {e}")

        # Not found anywhere
        raise ToolNotFoundError(
            name,
            details={
                "version": version,
                "searched": ["local", "global", "remote"],
            },
        )

    def tool_list(self, source: Optional[str] = None) -> list[ResolutionResult]:
        """
        List all available tools.

        Args:
            source: Optional filter by source ('local', 'global', 'remote')

        Returns:
            List of resolution results
        """
        results = []

        if source is None or source == "local":
            results.extend(self.local_resolver.list_all())

        if source is None or source == "global":
            results.extend(self.global_resolver.list_all())

        if source is None or source == "remote":
            if self.config.remote_registry_url:
                try:
                    results.extend(self.remote_resolver.list_all())
                except Exception as e:
                    self.logger.warning(f"Failed to list from remote registry: {e}")

        return results

    def tool_exists(self, name: str, version: Optional[str] = None) -> bool:
        """
        Check if a tool exists.

        Args:
            name: Tool name
            version: Optional version constraint

        Returns:
            True if tool exists, False otherwise
        """
        try:
            self.tool_resolve(name, version)
            return True
        except ToolNotFoundError:
            return False

    def tool_info(self, name: str, version: Optional[str] = None) -> dict:
        """
        Get detailed information about a tool.

        Args:
            name: Tool name
            version: Optional version constraint

        Returns:
            Dictionary with tool information
        """
        result = self.tool_resolve(name, version)
        return {
            "name": result.name,
            "version": result.version,
            "path": result.path,
            "source": result.source,
            "metadata": result.metadata,
        }
