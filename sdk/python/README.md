# Fractary Forge Python SDK

Python SDK for Fractary Forge - Create, manage, and execute AI agent definitions.

## Installation

```bash
pip install fractary-forge
```

### Optional Dependencies

For LangChain integration:
```bash
pip install fractary-forge[langchain]
```

For development:
```bash
pip install fractary-forge[dev]
```

## Quick Start

```python
from fractary_forge import AgentAPI, ToolAPI

# Initialize API clients
agent_api = AgentAPI()
tool_api = ToolAPI()

# List available agents
agents = agent_api.agent_list()
print(f"Found {len(agents)} agents")

# Get agent information
agent = agent_api.agent_resolve("my-agent")
info = agent_api.agent_info_get("my-agent")
print(f"Agent: {info['name']} v{info['version']}")

# List tools
tools = tool_api.tool_list()
print(f"Found {len(tools)} tools")

# Execute a tool
result = tool_api.tool_execute("my-tool", {"param": "value"})
print(f"Result: {result}")
```

## Naming Convention

The Python SDK follows the **{noun}_{action}** naming pattern (PEP 8 snake_case):

- `agent_resolve()` - Resolve an agent
- `agent_info_get()` - Get agent information
- `agent_list()` - List agents
- `tool_execute()` - Execute a tool
- `plugin_install()` - Install a plugin

This ensures consistency with the JavaScript SDK while following Python conventions.

## Features

### Agent Management
- Resolve and load agent definitions
- List available agents with filtering
- Get detailed agent information
- Validate agent definitions
- Health checks for CI/CD

### Tool Management
- Execute tools with timeout support
- List available tools
- Get tool information
- Tool resolution and validation

### Registry & Plugin Management
- Install plugins from registry
- Search for plugins
- Manage local and global registries
- Fork components for customization
- Resolve components with three-tier priority (local → global → remote)

### Configuration
- Project-level and global configuration
- Registry management
- Cache configuration
- Default settings

### Export
- Export to LangChain (optional dependency)
- Export to Claude Code format
- Export to n8n workflows

## API Reference

### AgentAPI

```python
from fractary_forge import AgentAPI

agent_api = AgentAPI()

# Resolve and load an agent
agent = agent_api.agent_resolve("agent-name")

# Get agent information
info = agent_api.agent_info_get("agent-name")

# List agents
agents = agent_api.agent_list()
filtered = agent_api.agent_list(filters={"tags": ["production"]})

# Check if agent exists
exists = agent_api.agent_has("agent-name")

# Health check
health = agent_api.agent_health_check("agent-name")

# Refresh prompt cache
agent_api.agent_cache_refresh("agent-name")
```

### ToolAPI

```python
from fractary_forge import ToolAPI

tool_api = ToolAPI()

# Execute a tool
result = tool_api.tool_execute("tool-name", {"param": "value"})

# Get tool information
info = tool_api.tool_info_get("tool-name")

# List tools
tools = tool_api.tool_list()

# Check if tool exists
exists = tool_api.tool_has("tool-name")
```

### Registry

```python
from fractary_forge import Registry

# Install a plugin
Registry.installer.plugin_install("plugin-name")

# Uninstall a plugin
Registry.installer.plugin_uninstall("plugin-name", scope="project")

# Search for plugins
results = Registry.resolver.plugin_search("search-query")

# List installed plugins
plugins = Registry.resolver.plugin_list()

# Fork a component
Registry.fork_manager.agent_fork(
    name="original-agent",
    forked_name="my-forked-agent"
)

# Check for upstream updates
updates = Registry.fork_manager.upstream_check("my-forked-agent")

# Merge upstream changes
Registry.fork_manager.upstream_merge("my-forked-agent")
```

### Configuration

```python
from fractary_forge import ConfigManager

config_manager = ConfigManager()

# Load configuration
config = config_manager.config_get()

# Save project configuration
config_manager.config_project_save(config)

# Save global configuration
config_manager.config_global_save(config)

# Add a registry
config_manager.registry_add({
    "name": "my-registry",
    "url": "https://registry.example.com",
    "priority": 100
})
```

### Cache

```python
from fractary_forge import CacheManager

cache_manager = CacheManager()

# Clear cache
cache_manager.cache_clear()

# Get cache statistics
stats = cache_manager.cache_stats_get()
print(f"Cache size: {stats['size']} entries: {stats['count']}")

# Enable/disable caching
cache_manager.cache_enable()
cache_manager.cache_disable()
```

### Exporters

```python
from fractary_forge.exporters import LangChainExporter, ClaudeExporter

# Export agent to LangChain
langchain_exporter = LangChainExporter()
code = langchain_exporter.agent_export("my-agent")

# Export to Claude Code format
claude_exporter = ClaudeExporter()
markdown = claude_exporter.agent_export("my-agent")
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/fractary/forge.git
cd forge/sdk/python

# Install in development mode
pip install -e ".[dev]"
```

### Testing

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=fractary_forge --cov-report=html

# Run type checking
mypy fractary_forge

# Run linting
ruff check fractary_forge
```

### Code Style

```bash
# Format code
black fractary_forge tests

# Check formatting
black --check fractary_forge tests
```

## Comparison with JavaScript SDK

| Feature | JavaScript SDK | Python SDK |
|---------|---------------|------------|
| Naming | camelCase | snake_case |
| Example | `agentResolve()` | `agent_resolve()` |
| Classes | PascalCase | PascalCase |
| Async | Promises | async/await |
| Type Checking | TypeScript | Type hints + mypy |

Both SDKs provide 100% feature parity with consistent functionality.

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## Support

- Documentation: https://github.com/fractary/forge#readme
- Issues: https://github.com/fractary/forge/issues
- Discord: https://discord.gg/fractary
