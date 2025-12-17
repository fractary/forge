"""
Local resolver for agent and tool resolution.
"""

from typing import Optional
from pathlib import Path
import yaml

from .base_resolver import BaseResolver
from ...types import ResolutionResult
from ...errors import ResolutionError
from ...logger import get_logger


class LocalResolver(BaseResolver):
    """Resolver for local registry (project-level)."""

    def __init__(self, registry_path: Optional[str] = None):
        """
        Initialize local resolver.

        Args:
            registry_path: Path to local registry directory (default: ./.forge)
        """
        if registry_path is None:
            registry_path = "./.forge"
        super().__init__(registry_path)
        self.logger = get_logger()

    def resolve(self, name: str, version: Optional[str] = None) -> Optional[ResolutionResult]:
        """
        Resolve from local registry.

        Args:
            name: Name to resolve
            version: Optional version constraint

        Returns:
            ResolutionResult if found, None otherwise
        """
        if not self.registry_path or not self.registry_path.exists():
            self.logger.debug(f"Local registry not found at {self.registry_path}")
            return None

        parsed_name, parsed_version = self._parse_name_version(name)
        version = version or parsed_version

        # Search in agents and tools directories
        for item_type in ["agents", "tools"]:
            type_dir = self.registry_path / item_type / parsed_name
            if not type_dir.exists():
                continue

            # Find matching version
            result = self._find_version(type_dir, parsed_name, version)
            if result:
                return result

        return None

    def _find_version(
        self, base_dir: Path, name: str, version: Optional[str]
    ) -> Optional[ResolutionResult]:
        """Find matching version in directory."""
        if not base_dir.exists():
            return None

        # If specific version requested
        if version:
            version_file = base_dir / version / "definition.yaml"
            if version_file.exists():
                return self._create_result(name, version, version_file)
            return None

        # Find latest version
        versions = [d.name for d in base_dir.iterdir() if d.is_dir()]
        if not versions:
            return None

        # Sort versions (simple lexical sort for now)
        # TODO: Implement proper semver sorting
        versions.sort(reverse=True)
        latest_version = versions[0]
        version_file = base_dir / latest_version / "definition.yaml"

        if version_file.exists():
            return self._create_result(name, latest_version, version_file)

        return None

    def _create_result(self, name: str, version: str, definition_path: Path) -> ResolutionResult:
        """Create resolution result from definition file."""
        try:
            with open(definition_path, "r", encoding="utf-8") as f:
                definition = yaml.safe_load(f)

            return ResolutionResult(
                name=name,
                version=version,
                path=str(definition_path.parent),
                source="local",
                metadata=definition or {},
            )
        except Exception as e:
            self.logger.error(f"Failed to load definition from {definition_path}: {e}")
            raise ResolutionError(
                f"Failed to load definition: {e}",
                name=name,
                details={"path": str(definition_path)},
            )

    def list_all(self) -> list[ResolutionResult]:
        """List all items in local registry."""
        results = []

        if not self.registry_path or not self.registry_path.exists():
            return results

        for item_type in ["agents", "tools"]:
            type_dir = self.registry_path / item_type
            if not type_dir.exists():
                continue

            for name_dir in type_dir.iterdir():
                if not name_dir.is_dir():
                    continue

                name = name_dir.name
                for version_dir in name_dir.iterdir():
                    if not version_dir.is_dir():
                        continue

                    version = version_dir.name
                    definition_path = version_dir / "definition.yaml"
                    if definition_path.exists():
                        result = self._create_result(name, version, definition_path)
                        results.append(result)

        return results
