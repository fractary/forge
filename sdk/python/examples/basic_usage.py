"""
Basic usage examples for Fractary Forge Python SDK.

This example demonstrates the {noun}_{action} naming convention.
"""

from fractary_forge import (
    AgentRegistry,
    ToolRegistry,
    AgentAPI,
    ToolAPI,
    AgentConfig,
    ToolConfig,
    load_config,
)


def example_agent_resolution():
    """Example: Resolve an agent using three-tier resolution."""
    print("=== Agent Resolution Example ===\n")

    # Create registry with custom config
    config = AgentConfig(
        local_registry_path="./.forge",
        global_registry_path="~/.forge",
        remote_registry_url="https://registry.fractary.com",
    )
    registry = AgentRegistry(config)

    try:
        # Resolve agent (local → global → remote)
        result = registry.agent_resolve("code-analyzer")
        print(f"✓ Resolved agent: {result.name}@{result.version}")
        print(f"  Source: {result.source}")
        print(f"  Path: {result.path}")

        # Resolve with version
        result = registry.agent_resolve("code-analyzer", version="1.0.0")
        print(f"\n✓ Resolved specific version: {result.version}")

        # Check if agent exists
        exists = registry.agent_exists("code-analyzer")
        print(f"\n✓ Agent exists: {exists}")

        # Get agent info
        info = registry.agent_info("code-analyzer")
        print(f"\n✓ Agent info: {info}")

    except Exception as e:
        print(f"✗ Error: {e}")


def example_tool_resolution():
    """Example: Resolve a tool using three-tier resolution."""
    print("\n=== Tool Resolution Example ===\n")

    # Create registry with default config
    registry = ToolRegistry()

    try:
        # Resolve tool
        result = registry.tool_resolve("formatter")
        print(f"✓ Resolved tool: {result.name}@{result.version}")
        print(f"  Source: {result.source}")

        # List all tools
        tools = registry.tool_list()
        print(f"\n✓ Found {len(tools)} tools:")
        for tool in tools[:5]:  # Show first 5
            print(f"  - {tool.name}@{tool.version} ({tool.source})")

    except Exception as e:
        print(f"✗ Error: {e}")


def example_agent_api():
    """Example: Work with agent definitions."""
    print("\n=== Agent API Example ===\n")

    try:
        # Load agent definition
        agent = AgentAPI("./.forge/agents/code-analyzer/1.0.0/definition.yaml")

        # Access metadata using {noun}_{action} naming
        print(f"✓ Agent: {agent.get_name()}")
        print(f"  Version: {agent.get_version()}")
        print(f"  Description: {agent.get_description()}")
        print(f"  Tags: {', '.join(agent.get_tags())}")

        # Get dependencies
        deps = agent.get_dependencies()
        if deps:
            print(f"  Dependencies:")
            for name, version in deps.items():
                print(f"    - {name}@{version}")

        # Convert to dict/yaml
        agent_dict = agent.to_dict()
        agent_yaml = agent.to_yaml()
        print(f"\n✓ Exported to dict: {len(agent_dict)} keys")
        print(f"✓ Exported to YAML: {len(agent_yaml)} bytes")

    except Exception as e:
        print(f"✗ Error: {e}")


def example_tool_api():
    """Example: Work with tool definitions."""
    print("\n=== Tool API Example ===\n")

    try:
        # Load tool definition
        tool = ToolAPI("./.forge/tools/formatter/1.0.0/definition.yaml")

        # Access metadata
        print(f"✓ Tool: {tool.get_name()}")
        print(f"  Version: {tool.get_version()}")
        print(f"  Description: {tool.get_description()}")

        # Get input schema
        schema = tool.get_input_schema()
        print(f"  Input schema: {len(schema)} properties")

    except Exception as e:
        print(f"✗ Error: {e}")


def example_list_all_agents():
    """Example: List all agents across registries."""
    print("\n=== List All Agents Example ===\n")

    registry = AgentRegistry()

    # List all agents
    agents = registry.agent_list()
    print(f"✓ Total agents: {len(agents)}\n")

    # Group by source
    by_source = {"local": [], "global": [], "remote": []}
    for agent in agents:
        by_source[agent.source].append(agent)

    for source, items in by_source.items():
        print(f"  {source.capitalize()}: {len(items)} agents")
        for agent in items[:3]:  # Show first 3
            print(f"    - {agent.name}@{agent.version}")


def example_config_loading():
    """Example: Load and manage configuration."""
    print("\n=== Configuration Example ===\n")

    # Load config from file and environment
    config = load_config()

    print("✓ Loaded configuration:")
    print(f"  Local registry: {config['registry']['local_path']}")
    print(f"  Global registry: {config['registry']['global_path']}")
    print(f"  Remote URL: {config['registry']['remote_url']}")
    print(f"  Cache enabled: {config['cache']['enabled']}")
    print(f"  Cache TTL: {config['cache']['ttl']}s")


if __name__ == "__main__":
    print("Fractary Forge Python SDK - Basic Usage Examples")
    print("=" * 50)

    # Run examples
    example_agent_resolution()
    example_tool_resolution()
    example_agent_api()
    example_tool_api()
    example_list_all_agents()
    example_config_loading()

    print("\n" + "=" * 50)
    print("✓ All examples completed!")
