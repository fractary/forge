"""
Remote resolver for agent and tool resolution.
"""

from typing import Optional
import httpx

from .base_resolver import BaseResolver
from ...types import ResolutionResult
from ...errors import ResolutionError, NetworkError
from ...logger import get_logger


class RemoteResolver(BaseResolver):
    """Resolver for remote registry."""

    def __init__(self, registry_url: Optional[str] = None):
        """
        Initialize remote resolver.

        Args:
            registry_url: URL of remote registry
        """
        super().__init__(None)
        self.registry_url = registry_url or "https://registry.fractary.com"
        self.logger = get_logger()
        self.client = httpx.Client(timeout=30.0)

    def resolve(self, name: str, version: Optional[str] = None) -> Optional[ResolutionResult]:
        """
        Resolve from remote registry.

        Args:
            name: Name to resolve
            version: Optional version constraint

        Returns:
            ResolutionResult if found, None otherwise

        Raises:
            NetworkError: If request fails
        """
        parsed_name, parsed_version = self._parse_name_version(name)
        version = version or parsed_version

        try:
            # Build API endpoint
            endpoint = f"{self.registry_url}/api/v1/resolve"
            params = {"name": parsed_name}
            if version:
                params["version"] = version

            response = self.client.get(endpoint, params=params)

            if response.status_code == 404:
                return None

            if response.status_code != 200:
                raise NetworkError(
                    f"Remote registry returned status {response.status_code}",
                    status_code=response.status_code,
                )

            data = response.json()
            return ResolutionResult(
                name=data["name"],
                version=data["version"],
                path=data.get("path", ""),
                source="remote",
                metadata=data.get("metadata", {}),
            )

        except httpx.HTTPError as e:
            raise NetworkError(
                f"Failed to connect to remote registry: {e}",
                details={"url": self.registry_url},
            )

    def list_all(self) -> list[ResolutionResult]:
        """
        List all items in remote registry.

        Returns:
            List of resolution results

        Raises:
            NetworkError: If request fails
        """
        try:
            endpoint = f"{self.registry_url}/api/v1/list"
            response = self.client.get(endpoint)

            if response.status_code != 200:
                raise NetworkError(
                    f"Remote registry returned status {response.status_code}",
                    status_code=response.status_code,
                )

            data = response.json()
            return [
                ResolutionResult(
                    name=item["name"],
                    version=item["version"],
                    path=item.get("path", ""),
                    source="remote",
                    metadata=item.get("metadata", {}),
                )
                for item in data.get("items", [])
            ]

        except httpx.HTTPError as e:
            raise NetworkError(
                f"Failed to connect to remote registry: {e}",
                details={"url": self.registry_url},
            )

    def __del__(self):
        """Cleanup HTTP client."""
        if hasattr(self, "client"):
            self.client.close()
