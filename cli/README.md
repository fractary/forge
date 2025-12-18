# @fractary/forge-cli

> **Command-line interface for Fractary Forge**

Create, manage, and publish AI agent definitions from the command line.

[![npm version](https://img.shields.io/npm/v/@fractary/forge-cli)](https://www.npmjs.com/package/@fractary/forge-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- **Agent Management**: Create, list, validate, and manage AI agents
- **Tool Management**: Define and manage tools for your agents
- **Plugin System**: Install and manage plugin collections
- **Registry Support**: Access local, global, and remote registries
- **Fork Workflows**: Fork and customize components
- **Cache Management**: Control caching for performance
- **Export Support**: Export to LangChain, Claude Code, n8n

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g @fractary/forge-cli
```

### Local Installation

```bash
npm install --save-dev @fractary/forge-cli
```

### Verify Installation

```bash
fractary-forge --version
```

## 🚀 Quick Start

### Initialize Project

```bash
# Initialize Forge configuration
fractary-forge init

# Initialize with options
fractary-forge init --org my-org --global
```

### Create Your First Agent

```bash
# Create a new agent
fractary-forge agent-create my-assistant

# This creates: .fractary/agents/my-assistant.md
```

Edit the agent definition:

```yaml
---
name: my-assistant
version: 1.0.0
type: agent
description: A helpful AI assistant
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  temperature: 0.7
tools:
  - web-search
  - file-reader
---

# System Prompt

You are a helpful assistant.
```

### Validate and List

```bash
# Validate agent
fractary-forge agent-validate my-assistant

# List all agents
fractary-forge agent-list

# Get agent info
fractary-forge agent-info my-assistant
```

## 📖 Command Reference

### Configuration

#### `init`

Initialize Forge configuration.

```bash
fractary-forge init [options]

Options:
  --org <slug>     Organization slug
  --global         Initialize global registry
  --force          Overwrite existing config
```

### Agent Management

#### `agent-create`

Create a new agent definition.

```bash
fractary-forge agent-create <name> [options]

Options:
  --description <text>   Agent description
  --model <model>        LLM model to use
  --provider <provider>  LLM provider (anthropic/openai/google)
  --tools <tools>        Comma-separated tool list
```

#### `agent-list`

List available agents.

```bash
fractary-forge agent-list [options]

Options:
  --source <source>   Filter by source (local/global/remote)
  --tag <tag>         Filter by tag
  --json              Output as JSON
```

#### `agent-info`

Show agent details.

```bash
fractary-forge agent-info <name> [options]

Options:
  --version <version>  Specific version
  --include-tools      Include tool definitions
```

#### `agent-validate`

Validate agent definition.

```bash
fractary-forge agent-validate <name>
```

### Plugin Management

#### `install`

Install a plugin.

```bash
fractary-forge install <plugin> [options]

Options:
  --global           Install globally
  --version <ver>    Specific version
  --force            Force reinstall
  --agents-only      Install agents only
  --tools-only       Install tools only
```

#### `uninstall`

Uninstall a plugin.

```bash
fractary-forge uninstall <plugin> [options]

Options:
  --global    Uninstall from global registry
```

#### `list`

List installed plugins.

```bash
fractary-forge list [options]

Options:
  --global    List global plugins
  --local     List local plugins only
  --json      Output as JSON
```

#### `search`

Search for plugins.

```bash
fractary-forge search <query> [options]

Options:
  --tag <tag>      Filter by tag
  --limit <num>    Max results (default: 20)
```

#### `info`

Show plugin information.

```bash
fractary-forge info <plugin>
```

### Fork & Merge

#### `fork`

Fork a component for customization.

```bash
fractary-forge fork <source> <target> [options]

Options:
  --type <type>    Component type (agent/tool)
  --description    Custom description
```

#### `merge`

Merge upstream changes.

```bash
fractary-forge merge <name> [options]

Options:
  --strategy <strategy>  Merge strategy (auto/manual)
  --dry-run             Show changes without applying
```

### Cache Management

#### `cache-clear`

Clear cache entries.

```bash
fractary-forge cache-clear [options]

Options:
  --pattern <pattern>  Clear matching entries
  --stale-only         Clear stale entries only
```

#### `cache-stats`

Show cache statistics.

```bash
fractary-forge cache-stats
```

### Registry Configuration

#### `registry-add`

Add a registry source.

```bash
fractary-forge registry-add <name> <url> [options]

Options:
  --priority <num>  Registry priority (1 = highest)
  --auth <token>    Authentication token
```

#### `registry-list`

List configured registries.

```bash
fractary-forge registry-list
```

#### `registry-remove`

Remove a registry source.

```bash
fractary-forge registry-remove <name>
```

### Authentication

#### `login`

Authenticate with a registry.

```bash
fractary-forge login [registry]
```

#### `logout`

Clear authentication.

```bash
fractary-forge logout [registry]
```

#### `whoami`

Show current user.

```bash
fractary-forge whoami
```

## 📚 Documentation

- **[Complete Documentation](../docs/README.md)** - Full documentation index
- **[Getting Started Guide](../docs/guides/getting-started.md)** - Quick start
- **[Command Reference](../docs/guides/command-reference.md)** - All commands
- **[Configuration Guide](../docs/guides/configuration.md)** - Configuration
- **[Workflow Guides](../docs/guides/workflow-guides.md)** - Common workflows

## 💡 Common Workflows

### Installing and Using a Plugin

```bash
# Search for plugins
fractary-forge search faber

# Install plugin globally
fractary-forge install @fractary/faber-plugin --global

# List what was installed
fractary-forge list --global

# Get plugin info
fractary-forge info @fractary/faber-plugin
```

### Fork and Customize

```bash
# Fork an agent
fractary-forge fork faber-planner my-custom-planner

# Edit the customization
# .fractary/agents/my-custom-planner.md

# Later, check for upstream updates
fractary-forge fork-check-updates my-custom-planner

# Merge upstream changes
fractary-forge merge my-custom-planner
```

### Working with Multiple Registries

```bash
# Add company registry
fractary-forge registry-add company-internal \
  https://registry.company.com/forge.json \
  --priority 1

# Add community registry
fractary-forge registry-add community \
  https://community-forge.dev/registry.json \
  --priority 2

# List registries
fractary-forge registry-list

# Search across all registries
fractary-forge search "data analysis"
```

## 🔧 Configuration

### Project Configuration

File: `.fractary/forge.config.json`

```json
{
  "version": "1.0.0",
  "resolvers": {
    "local": {
      "enabled": true,
      "paths": [
        ".fractary/agents",
        ".fractary/tools"
      ]
    },
    "global": {
      "enabled": true,
      "path": "~/.fractary/registry"
    },
    "remote": {
      "enabled": true,
      "registries": [
        {
          "name": "fractary-core",
          "url": "https://raw.githubusercontent.com/fractary/plugins/main/registry.json",
          "priority": 1
        }
      ]
    }
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  }
}
```

### Global Configuration

File: `~/.fractary/config.json`

```json
{
  "registries": [
    {
      "name": "fractary-core",
      "url": "https://raw.githubusercontent.com/fractary/plugins/main/registry.json",
      "enabled": true
    }
  ],
  "auth": {
    "tokens": {}
  }
}
```

## 🛠️ Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/fractary/forge.git
cd forge/cli

# Install dependencies
npm install

# Build
npm run build

# Link globally for testing
npm link

# Test
fractary-forge --version
```

### Running Tests

```bash
npm test
```

See [Developer Guide](../docs/DEVELOPER.md) for contribution guidelines.

## 🐛 Troubleshooting

### Command Not Found

```bash
# Ensure global installation
npm install -g @fractary/forge-cli

# Or use npx
npx @fractary/forge-cli --version
```

### Permission Errors

```bash
# On macOS/Linux, may need sudo for global install
sudo npm install -g @fractary/forge-cli

# Or use nvm to avoid sudo
```

### Cache Issues

```bash
# Clear cache
fractary-forge cache-clear

# Or manually
rm -rf ~/.fractary/cache
```

## 📄 License

MIT © [Fractary](https://fractary.com)

## 🔗 Links

- **[GitHub](https://github.com/fractary/forge)** - Source code
- **[NPM](https://www.npmjs.com/package/@fractary/forge-cli)** - Package registry
- **[Documentation](../docs/README.md)** - Full documentation
- **[SDK Package](../sdk/js/)** - JavaScript/TypeScript SDK
- **[MCP Server](../mcp/server/)** - Model Context Protocol server
- **[Issues](https://github.com/fractary/forge/issues)** - Bug reports

## 🤝 Related Packages

- **[@fractary/forge](../sdk/js/)** - Core SDK
- **[@fractary/forge-mcp](../mcp/server/)** - MCP server for Claude Desktop

---

**Made with ❤️ by the Fractary team**
