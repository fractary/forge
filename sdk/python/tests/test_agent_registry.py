"""
Test AgentRegistry functionality.
"""

import pytest
from fractary_forge import AgentRegistry, AgentConfig, AgentNotFoundError


class TestAgentRegistry:
    """Test AgentRegistry class."""

    def test_registry_initialization(self):
        """Test that AgentRegistry can be initialized."""
        registry = AgentRegistry()
        assert registry is not None
        assert isinstance(registry, AgentRegistry)

    def test_registry_with_custom_config(self):
        """Test registry initialization with custom config."""
        config = AgentConfig(
            local_registry_path="./.forge",
            cache_enabled=True,
            cache_ttl=3600,
        )
        registry = AgentRegistry(config)
        assert registry is not None
        assert registry.config == config

    def test_agent_resolve_method_exists(self):
        """Test that agent_resolve method exists."""
        registry = AgentRegistry()
        assert hasattr(registry, 'agent_resolve')
        assert callable(registry.agent_resolve)

    def test_agent_list_method_exists(self):
        """Test that agent_list method exists."""
        registry = AgentRegistry()
        assert hasattr(registry, 'agent_list')
        assert callable(registry.agent_list)

    def test_agent_exists_method_exists(self):
        """Test that agent_exists method exists."""
        registry = AgentRegistry()
        assert hasattr(registry, 'agent_exists')
        assert callable(registry.agent_exists)

    def test_agent_info_method_exists(self):
        """Test that agent_info method exists."""
        registry = AgentRegistry()
        assert hasattr(registry, 'agent_info')
        assert callable(registry.agent_info)

    @pytest.mark.asyncio
    async def test_agent_resolve_raises_not_found(self):
        """Test that resolving non-existent agent raises error."""
        registry = AgentRegistry()

        with pytest.raises(AgentNotFoundError) as exc_info:
            await registry.agent_resolve('non-existent-agent')

        assert 'non-existent-agent' in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_agent_exists_returns_false_for_missing(self):
        """Test that agent_exists returns False for missing agents."""
        registry = AgentRegistry()
        exists = await registry.agent_exists('definitely-does-not-exist')
        assert exists is False

    @pytest.mark.asyncio
    async def test_agent_list_returns_list(self):
        """Test that agent_list returns a list."""
        registry = AgentRegistry()
        agents = await registry.agent_list()
        assert isinstance(agents, list)


class TestAgentConfig:
    """Test AgentConfig class."""

    def test_config_creation(self):
        """Test AgentConfig can be created."""
        config = AgentConfig()
        assert config is not None

    def test_config_with_custom_values(self):
        """Test AgentConfig with custom values."""
        config = AgentConfig(
            local_registry_path="/custom/path",
            cache_enabled=False,
            cache_ttl=7200,
            auto_install=True,
        )

        assert config.local_registry_path == "/custom/path"
        assert config.cache_enabled is False
        assert config.cache_ttl == 7200
        assert config.auto_install is True

    def test_config_defaults(self):
        """Test AgentConfig default values."""
        config = AgentConfig()
        assert config.cache_enabled is True
        assert config.cache_ttl == 3600
        assert config.auto_install is False
        assert config.strict_validation is True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
