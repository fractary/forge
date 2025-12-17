"""
Custom exception classes for Fractary Forge SDK.
"""

from typing import Any, Optional


class ForgeError(Exception):
    """Base exception for all Forge errors."""

    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code or self.__class__.__name__
        self.details = details or {}

    def __str__(self) -> str:
        if self.details:
            return f"{self.message} (code: {self.code}, details: {self.details})"
        return f"{self.message} (code: {self.code})"


class AgentNotFoundError(ForgeError):
    """Raised when an agent cannot be found."""

    def __init__(self, agent_name: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            f"Agent not found: {agent_name}",
            code="AGENT_NOT_FOUND",
            details=details,
        )
        self.agent_name = agent_name


class ToolNotFoundError(ForgeError):
    """Raised when a tool cannot be found."""

    def __init__(self, tool_name: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            f"Tool not found: {tool_name}",
            code="TOOL_NOT_FOUND",
            details=details,
        )
        self.tool_name = tool_name


class ValidationError(ForgeError):
    """Raised when validation fails."""

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code="VALIDATION_ERROR", details=details)
        self.field = field


class ExecutionError(ForgeError):
    """Raised when execution fails."""

    def __init__(
        self,
        message: str,
        exit_code: Optional[int] = None,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code="EXECUTION_ERROR", details=details)
        self.exit_code = exit_code


class ResolutionError(ForgeError):
    """Raised when resolution fails."""

    def __init__(
        self,
        message: str,
        name: str,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code="RESOLUTION_ERROR", details=details)
        self.name = name


class CacheError(ForgeError):
    """Raised when cache operations fail."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, code="CACHE_ERROR", details=details)


class ConfigError(ForgeError):
    """Raised when configuration is invalid."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, code="CONFIG_ERROR", details=details)


class NetworkError(ForgeError):
    """Raised when network operations fail."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code="NETWORK_ERROR", details=details)
        self.status_code = status_code
