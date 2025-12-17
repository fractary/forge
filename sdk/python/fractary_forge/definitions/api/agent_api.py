"""
Agent API for defining and working with agents.
"""

from typing import Any, Optional
from pathlib import Path
import yaml

from ...errors import ValidationError, AgentNotFoundError
from ...types import AgentMetadata
from ...logger import get_logger


class AgentAPI:
    """API for working with agent definitions."""

    def __init__(self, definition_path: Optional[str] = None):
        """
        Initialize AgentAPI.

        Args:
            definition_path: Path to agent definition file (YAML)
        """
        self.definition_path = definition_path
        self.metadata: Optional[AgentMetadata] = None
        self.definition: Optional[dict[str, Any]] = None
        self.logger = get_logger()

        if definition_path:
            self.load(definition_path)

    def load(self, path: str) -> "AgentAPI":
        """
        Load agent definition from YAML file.

        Args:
            path: Path to agent definition file

        Returns:
            Self for chaining

        Raises:
            AgentNotFoundError: If file not found
            ValidationError: If definition is invalid
        """
        file_path = Path(path)
        if not file_path.exists():
            raise AgentNotFoundError(
                str(file_path),
                details={"reason": "File not found"},
            )

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                self.definition = yaml.safe_load(f)

            self._validate_definition()
            self._extract_metadata()
            self.definition_path = path
            self.logger.debug(f"Loaded agent definition from {path}")
            return self

        except yaml.YAMLError as e:
            raise ValidationError(
                f"Invalid YAML in agent definition: {e}",
                details={"path": path},
            )

    def _validate_definition(self) -> None:
        """Validate the agent definition structure."""
        if not self.definition:
            raise ValidationError("Agent definition is empty")

        required_fields = ["name", "version", "description"]
        for field in required_fields:
            if field not in self.definition:
                raise ValidationError(
                    f"Missing required field: {field}",
                    field=field,
                )

    def _extract_metadata(self) -> None:
        """Extract metadata from definition."""
        if not self.definition:
            return

        self.metadata = AgentMetadata(
            name=self.definition["name"],
            version=self.definition["version"],
            description=self.definition.get("description"),
            author=self.definition.get("author"),
            tags=self.definition.get("tags", []),
            dependencies=self.definition.get("dependencies", {}),
        )

    def get_name(self) -> str:
        """Get agent name."""
        if not self.metadata:
            raise ValidationError("No agent loaded")
        return self.metadata.name

    def get_version(self) -> str:
        """Get agent version."""
        if not self.metadata:
            raise ValidationError("No agent loaded")
        return self.metadata.version

    def get_description(self) -> Optional[str]:
        """Get agent description."""
        if not self.metadata:
            return None
        return self.metadata.description

    def get_tags(self) -> list[str]:
        """Get agent tags."""
        if not self.metadata:
            return []
        return self.metadata.tags

    def get_dependencies(self) -> dict[str, str]:
        """Get agent dependencies."""
        if not self.metadata:
            return {}
        return self.metadata.dependencies

    def to_dict(self) -> dict[str, Any]:
        """Convert agent definition to dictionary."""
        if not self.definition:
            return {}
        return self.definition

    def to_yaml(self) -> str:
        """Convert agent definition to YAML string."""
        if not self.definition:
            return ""
        return yaml.dump(self.definition, sort_keys=False)
