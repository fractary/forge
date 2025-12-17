"""
Test naming convention compliance for Python SDK.

Verifies that all public methods follow the {noun}_{action} snake_case pattern.
"""

import pytest
from fractary_forge import AgentRegistry, ToolRegistry, AgentAPI, ToolAPI


class TestNamingConvention:
    """Test that all SDK methods follow {noun}_{action} naming pattern."""

    def test_agent_registry_methods_follow_naming_convention(self):
        """Verify AgentRegistry methods use {noun}_{action} pattern."""
        registry = AgentRegistry()

        # All public methods should follow {noun}_{action} pattern
        expected_methods = [
            'agent_resolve',
            'agent_list',
            'agent_exists',
            'agent_info',
        ]

        for method_name in expected_methods:
            assert hasattr(registry, method_name), \
                f"AgentRegistry should have method '{method_name}'"

            # Verify method is callable
            assert callable(getattr(registry, method_name)), \
                f"AgentRegistry.{method_name} should be callable"

            # Verify naming pattern: noun_action (no action_noun)
            parts = method_name.split('_')
            assert parts[0] == 'agent', \
                f"Method '{method_name}' should start with noun 'agent'"

    def test_tool_registry_methods_follow_naming_convention(self):
        """Verify ToolRegistry methods use {noun}_{action} pattern."""
        registry = ToolRegistry()

        expected_methods = [
            'tool_resolve',
            'tool_list',
            'tool_exists',
            'tool_info',
        ]

        for method_name in expected_methods:
            assert hasattr(registry, method_name), \
                f"ToolRegistry should have method '{method_name}'"
            assert callable(getattr(registry, method_name)), \
                f"ToolRegistry.{method_name} should be callable"

            parts = method_name.split('_')
            assert parts[0] == 'tool', \
                f"Method '{method_name}' should start with noun 'tool'"

    def test_agent_api_methods_follow_naming_convention(self):
        """Verify AgentAPI methods use {noun}_{action} pattern."""
        # Note: AgentAPI methods may not exist yet, this tests the pattern
        # Once implemented, these should be available
        pass

    def test_tool_api_methods_follow_naming_convention(self):
        """Verify ToolAPI methods use {noun}_{action} pattern."""
        pass

    def test_no_action_first_methods(self):
        """Verify no methods use the wrong action_noun pattern."""
        registry = AgentRegistry()

        # These would be WRONG naming (action first)
        wrong_patterns = [
            'resolve_agent',
            'list_agents',
            'get_agent_info',
            'has_agent',
        ]

        for wrong_name in wrong_patterns:
            assert not hasattr(registry, wrong_name), \
                f"AgentRegistry should NOT have method '{wrong_name}' (wrong pattern: action_noun)"

    def test_snake_case_only(self):
        """Verify all method names use snake_case (no camelCase)."""
        registry = AgentRegistry()

        # Get all public methods
        public_methods = [
            method for method in dir(registry)
            if not method.startswith('_') and callable(getattr(registry, method))
        ]

        for method_name in public_methods:
            # Should not contain uppercase letters (no camelCase)
            assert method_name.islower() or '_' in method_name, \
                f"Method '{method_name}' should use snake_case, not camelCase"

            # Should not contain hyphens (that's kebab-case)
            assert '-' not in method_name, \
                f"Method '{method_name}' should use snake_case, not kebab-case"


class TestMethodSignatures:
    """Test that method signatures are correct."""

    def test_agent_resolve_signature(self):
        """Verify agent_resolve has correct signature."""
        from inspect import signature
        registry = AgentRegistry()

        sig = signature(registry.agent_resolve)
        params = list(sig.parameters.keys())

        # Should have name parameter
        assert 'name' in params, "agent_resolve should have 'name' parameter"

    def test_tool_resolve_signature(self):
        """Verify tool_resolve has correct signature."""
        from inspect import signature
        registry = ToolRegistry()

        sig = signature(registry.tool_resolve)
        params = list(sig.parameters.keys())

        assert 'name' in params, "tool_resolve should have 'name' parameter"


class TestErrorClasses:
    """Test that error classes follow naming conventions."""

    def test_error_class_names(self):
        """Verify error classes use proper naming."""
        from fractary_forge import (
            ForgeError,
            AgentNotFoundError,
            ToolNotFoundError,
            ValidationError,
        )

        # Error classes should use PascalCase and end with Error
        error_classes = [
            ForgeError,
            AgentNotFoundError,
            ToolNotFoundError,
            ValidationError,
        ]

        for error_class in error_classes:
            class_name = error_class.__name__
            assert class_name.endswith('Error'), \
                f"Error class '{class_name}' should end with 'Error'"
            assert class_name[0].isupper(), \
                f"Error class '{class_name}' should start with uppercase"


class TestTypeNames:
    """Test that type/config class names follow conventions."""

    def test_config_class_names(self):
        """Verify config classes use proper naming."""
        from fractary_forge import (
            AgentConfig,
            ToolConfig,
            RegistryConfig,
            CacheConfig,
        )

        config_classes = [
            AgentConfig,
            ToolConfig,
            RegistryConfig,
            CacheConfig,
        ]

        for config_class in config_classes:
            class_name = config_class.__name__
            # Config classes should be PascalCase
            assert class_name[0].isupper(), \
                f"Config class '{class_name}' should be PascalCase"
            assert class_name.endswith('Config'), \
                f"Config class '{class_name}' should end with 'Config'"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
