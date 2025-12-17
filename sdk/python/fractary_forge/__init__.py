"""
Fractary Forge Python SDK

A comprehensive SDK for working with agents and tools in the Fractary Forge ecosystem.
"""

from .definitions import AgentAPI, ToolAPI
from .registry import AgentRegistry, ToolRegistry
from .config import ConfigLoader, load_config, save_config
from .errors import (
    ForgeError,
    AgentNotFoundError,
    ToolNotFoundError,
    ValidationError,
    ExecutionError,
    ResolutionError,
    CacheError,
    ConfigError,
    NetworkError,
)
from .logger import ForgeLogger, get_logger
from .types import (
    AgentConfig,
    ToolConfig,
    RegistryConfig,
    CacheConfig,
    ResolutionResult,
    ExecutionResult,
    AgentMetadata,
    ToolMetadata,
)

__version__ = "1.0.0"

__all__ = [
    # Version
    "__version__",
    # APIs
    "AgentAPI",
    "ToolAPI",
    # Registries
    "AgentRegistry",
    "ToolRegistry",
    # Config
    "ConfigLoader",
    "load_config",
    "save_config",
    # Errors
    "ForgeError",
    "AgentNotFoundError",
    "ToolNotFoundError",
    "ValidationError",
    "ExecutionError",
    "ResolutionError",
    "CacheError",
    "ConfigError",
    "NetworkError",
    # Logger
    "ForgeLogger",
    "get_logger",
    # Types
    "AgentConfig",
    "ToolConfig",
    "RegistryConfig",
    "CacheConfig",
    "ResolutionResult",
    "ExecutionResult",
    "AgentMetadata",
    "ToolMetadata",
]
