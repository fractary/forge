"""
Tool API for defining and working with tools.
"""

from typing import Any, Optional
from pathlib import Path
import yaml

from ...errors import ValidationError, ToolNotFoundError
from ...types import ToolMetadata
from ...logger import get_logger


class ToolAPI:
    """API for working with tool definitions."""

    def __init__(self, definition_path: Optional[str] = None):
        """
        Initialize ToolAPI.

        Args:
            definition_path: Path to tool definition file (YAML)
        """
        self.definition_path = definition_path
        self.metadata: Optional[ToolMetadata] = None
        self.definition: Optional[dict[str, Any]] = None
        self.logger = get_logger()

        if definition_path:
            self.load(definition_path)

    def load(self, path: str) -> "ToolAPI":
        """
        Load tool definition from YAML file.

        Args:
            path: Path to tool definition file

        Returns:
            Self for chaining

        Raises:
            ToolNotFoundError: If file not found
            ValidationError: If definition is invalid
        """
        file_path = Path(path)
        if not file_path.exists():
            raise ToolNotFoundError(
                str(file_path),
                details={"reason": "File not found"},
            )

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                self.definition = yaml.safe_load(f)

            self._validate_definition()
            self._extract_metadata()
            self.definition_path = path
            self.logger.debug(f"Loaded tool definition from {path}")
            return self

        except yaml.YAMLError as e:
            raise ValidationError(
                f"Invalid YAML in tool definition: {e}",
                details={"path": path},
            )

    def _validate_definition(self) -> None:
        """Validate the tool definition structure."""
        if not self.definition:
            raise ValidationError("Tool definition is empty")

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

        self.metadata = ToolMetadata(
            name=self.definition["name"],
            version=self.definition["version"],
            description=self.definition.get("description"),
            author=self.definition.get("author"),
            tags=self.definition.get("tags", []),
            input_schema=self.definition.get("inputSchema", {}),
        )

    def get_name(self) -> str:
        """Get tool name."""
        if not self.metadata:
            raise ValidationError("No tool loaded")
        return self.metadata.name

    def get_version(self) -> str:
        """Get tool version."""
        if not self.metadata:
            raise ValidationError("No tool loaded")
        return self.metadata.version

    def get_description(self) -> Optional[str]:
        """Get tool description."""
        if not self.metadata:
            return None
        return self.metadata.description

    def get_tags(self) -> list[str]:
        """Get tool tags."""
        if not self.metadata:
            return []
        return self.metadata.tags

    def get_input_schema(self) -> dict[str, Any]:
        """Get tool input schema."""
        if not self.metadata:
            return {}
        return self.metadata.input_schema

    def to_dict(self) -> dict[str, Any]:
        """Convert tool definition to dictionary."""
        if not self.definition:
            return {}
        return self.definition

    def to_yaml(self) -> str:
        """Convert tool definition to YAML string."""
        if not self.definition:
            return ""
        return yaml.dump(self.definition, sort_keys=False)
