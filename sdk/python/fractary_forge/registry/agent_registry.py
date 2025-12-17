"""
Agent registry for resolving and managing agents.
"""

from typing import Optional
from pathlib import Path

from .resolvers import LocalResolver, GlobalResolver, RemoteResolver
from ..types import ResolutionResult, AgentConfig
from ..errors import AgentNotFoundError, ResolutionError
from ..logger import get_logger


class AgentRegistry:
    """Registry for resolving agents across local, global, and remote registries."""

    def __init__(self, config: Optional[AgentConfig] = None):
        """
        Initialize agent registry.

        Args:
            config: Configuration for registry behavior
        """
        self.config = config or AgentConfig()
        self.logger = get_logger()

        # Initialize resolvers
        self.local_resolver = LocalResolver(self.config.local_registry_path)
        self.global_resolver = GlobalResolver(self.config.global_registry_path)
        self.remote_resolver = RemoteResolver(self.config.remote_registry_url)

    def agent_resolve(
        self,
        name: str,
        version: Optional[str] = None,
        prefer_local: bool = True,
    ) -> ResolutionResult:
        """
        Resolve an agent using three-tier resolution (local → global → remote).

        Args:
            name: Agent name (e.g., 'my-agent' or 'my-agent@1.0.0')
            version: Optional version constraint
            prefer_local: If True, prefer local/global over remote

        Returns:
            ResolutionResult with agent location and metadata

        Raises:
            AgentNotFoundError: If agent cannot be found
        """
        self.logger.debug(f"Resolving agent: {name} (version: {version})")

        # Try local first
        result = self.local_resolver.resolve(name, version)
        if result:
            self.logger.info(f"Resolved agent '{name}' from local registry")
            return result

        # Try global
        result = self.global_resolver.resolve(name, version)
        if result:
            self.logger.info(f"Resolved agent '{name}' from global registry")
            return result

        # Try remote
        if self.config.remote_registry_url:
            try:
                result = self.remote_resolver.resolve(name, version)
                if result:
                    self.logger.info(f"Resolved agent '{name}' from remote registry")
                    return result
            except Exception as e:
                self.logger.warning(f"Failed to resolve from remote registry: {e}")

        # Not found anywhere
        raise AgentNotFoundError(
            name,
            details={
                "version": version,
                "searched": ["local", "global", "remote"],
            },
        )

    def agent_list(self, source: Optional[str] = None) -> list[ResolutionResult]:
        """
        List all available agents.

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

    def agent_exists(self, name: str, version: Optional[str] = None) -> bool:
        """
        Check if an agent exists.

        Args:
            name: Agent name
            version: Optional version constraint

        Returns:
            True if agent exists, False otherwise
        """
        try:
            self.agent_resolve(name, version)
            return True
        except AgentNotFoundError:
            return False

    def agent_info(self, name: str, version: Optional[str] = None) -> dict:
        """
        Get detailed information about an agent.

        Args:
            name: Agent name
            version: Optional version constraint

        Returns:
            Dictionary with agent information
        """
        result = self.agent_resolve(name, version)
        return {
            "name": result.name,
            "version": result.version,
            "path": result.path,
            "source": result.source,
            "metadata": result.metadata,
        }
