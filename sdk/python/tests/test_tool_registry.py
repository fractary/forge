"""
Test ToolRegistry functionality.
"""

import pytest
from fractary_forge import ToolRegistry, ToolConfig, ToolNotFoundError


class TestToolRegistry:
    """Test ToolRegistry class."""

    def test_registry_initialization(self):
        """Test that ToolRegistry can be initialized."""
        registry = ToolRegistry()
        assert registry is not None
        assert isinstance(registry, ToolRegistry)

    def test_registry_with_custom_config(self):
        """Test registry initialization with custom config."""
        config = ToolConfig(
            local_registry_path="./.forge",
            cache_enabled=True,
            timeout=60000,
        )
        registry = ToolRegistry(config)
        assert registry is not None
        assert registry.config == config

    def test_tool_resolve_method_exists(self):
        """Test that tool_resolve method exists."""
        registry = ToolRegistry()
        assert hasattr(registry, 'tool_resolve')
        assert callable(registry.tool_resolve)

    def test_tool_list_method_exists(self):
        """Test that tool_list method exists."""
        registry = ToolRegistry()
        assert hasattr(registry, 'tool_list')
        assert callable(registry.tool_list)

    def test_tool_exists_method_exists(self):
        """Test that tool_exists method exists."""
        registry = ToolRegistry()
        assert hasattr(registry, 'tool_exists')
        assert callable(registry.tool_exists)

    def test_tool_info_method_exists(self):
        """Test that tool_info method exists."""
        registry = ToolRegistry()
        assert hasattr(registry, 'tool_info')
        assert callable(registry.tool_info)

    @pytest.mark.asyncio
    async def test_tool_resolve_raises_not_found(self):
        """Test that resolving non-existent tool raises error."""
        registry = ToolRegistry()

        with pytest.raises(ToolNotFoundError) as exc_info:
            await registry.tool_resolve('non-existent-tool')

        assert 'non-existent-tool' in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_tool_exists_returns_false_for_missing(self):
        """Test that tool_exists returns False for missing tools."""
        registry = ToolRegistry()
        exists = await registry.tool_exists('definitely-does-not-exist')
        assert exists is False

    @pytest.mark.asyncio
    async def test_tool_list_returns_list(self):
        """Test that tool_list returns a list."""
        registry = ToolRegistry()
        tools = await registry.tool_list()
        assert isinstance(tools, list)


class TestToolConfig:
    """Test ToolConfig class."""

    def test_config_creation(self):
        """Test ToolConfig can be created."""
        config = ToolConfig()
        assert config is not None

    def test_config_with_custom_values(self):
        """Test ToolConfig with custom values."""
        config = ToolConfig(
            local_registry_path="/custom/path",
            cache_enabled=False,
            timeout=120000,
        )

        assert config.local_registry_path == "/custom/path"
        assert config.cache_enabled is False
        assert config.timeout == 120000

    def test_config_defaults(self):
        """Test ToolConfig default values."""
        config = ToolConfig()
        assert config.cache_enabled is True
        assert config.cache_ttl == 3600
        assert config.timeout == 30000


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
