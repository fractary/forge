"""
Base type definitions for Fractary Forge SDK.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field


class AgentMetadata(BaseModel):
    """Metadata for an agent."""

    name: str
    version: str
    description: Optional[str] = None
    author: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    dependencies: dict[str, str] = Field(default_factory=dict)


class ToolMetadata(BaseModel):
    """Metadata for a tool."""

    name: str
    version: str
    description: Optional[str] = None
    author: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    input_schema: dict[str, Any] = Field(default_factory=dict)


class AgentConfig(BaseModel):
    """Configuration for agent resolution and execution."""

    local_registry_path: Optional[str] = None
    global_registry_path: Optional[str] = None
    remote_registry_url: Optional[str] = None
    cache_enabled: bool = True
    cache_ttl: int = 3600
    auto_install: bool = False
    strict_validation: bool = True


class ToolConfig(BaseModel):
    """Configuration for tool resolution and execution."""

    local_registry_path: Optional[str] = None
    global_registry_path: Optional[str] = None
    remote_registry_url: Optional[str] = None
    cache_enabled: bool = True
    cache_ttl: int = 3600
    timeout: int = 30000


class RegistryConfig(BaseModel):
    """Configuration for the registry system."""

    local_path: Optional[str] = None
    global_path: Optional[str] = None
    remote_url: Optional[str] = None
    cache_enabled: bool = True
    cache_ttl: int = 3600


class CacheConfig(BaseModel):
    """Configuration for the cache system."""

    enabled: bool = True
    ttl: int = 3600
    max_size: int = 1000
    strategy: str = "lru"


class ResolutionResult(BaseModel):
    """Result of resolving an agent or tool."""

    name: str
    version: str
    path: str
    source: str  # 'local', 'global', or 'remote'
    metadata: dict[str, Any] = Field(default_factory=dict)


class ExecutionResult(BaseModel):
    """Result of executing a tool or agent."""

    success: bool
    output: Optional[str] = None
    error: Optional[str] = None
    exit_code: Optional[int] = None
    duration: Optional[float] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
