# Getting Started with Fractary Forge

Welcome to Fractary Forge! This guide will help you get up and running quickly with creating, managing, and publishing AI agent definitions.

## Table of Contents

- [What is Fractary Forge?](#what-is-fractary-forge)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Your First Agent](#your-first-agent)
- [Installing Plugins](#installing-plugins)
- [Working with Tools](#working-with-tools)
- [Next Steps](#next-steps)

## What is Fractary Forge?

Fractary Forge is a comprehensive system for managing AI agents, tools, and workflows. It provides:

- **Agent Definitions**: Define AI agents with specific capabilities, models, and prompts
- **Tool Management**: Create and share reusable tools that agents can use
- **Plugin System**: Install and distribute collections of agents and tools
- **Version Control**: Lock versions, fork components, and merge upstream changes
- **Multiple Formats**: Export to LangChain, Claude Code, n8n, and more

## Installation

### CLI Installation

Install the Fractary Forge CLI globally:

```bash
npm install -g @fractary/forge-cli
```

Verify installation:

```bash
fractary-forge --version
```

### SDK Installation

For programmatic access, install the SDK:

```bash
npm install @fractary/forge
```

### MCP Server Installation

For AI agent integration (Claude Code, etc.):

```bash
npm install -g @fractary/forge-mcp
```

## Quick Start

### 1. Initialize Your Project

Create a new Forge project or initialize an existing one:

```bash
# Navigate to your project directory
cd my-project

# Initialize Forge configuration
fractary-forge init --org myorg
```

This creates:
- `.fractary/forge/config.yaml` - Configuration file
- `.fractary/agents/` - Agent definitions directory
- `.fractary/tools/` - Tool definitions directory

### 2. Verify Setup

Check that everything is configured correctly:

```bash
fractary-forge list
```

You should see an empty list (no plugins installed yet).

## Your First Agent

Let's create a simple AI assistant agent.

### Step 1: Create the Agent

```bash
fractary-forge agent-create my-assistant \
  --description "A helpful AI assistant" \
  --model anthropic \
  --model-name claude-sonnet-4 \
  --prompt "You are a helpful assistant that answers questions clearly and concisely."
```

This creates `.fractary/agents/my-assistant.yaml`:

```yaml
name: my-assistant
type: agent
version: 1.0.0
description: A helpful AI assistant

llm:
  provider: anthropic
  model: claude-sonnet-4
  temperature: 0.7
  max_tokens: 4096

system_prompt: |
  You are a helpful assistant that answers questions clearly and concisely.

tools: []
tags:
  - assistant
```

### Step 2: View Agent Information

```bash
fractary-forge agent-info my-assistant
```

Output:
```
Name: my-assistant
Version: 1.0.0
Description: A helpful AI assistant
Model: anthropic/claude-sonnet-4
Tools: (none)
Location: local (.fractary/agents/)
```

### Step 3: Validate the Agent

```bash
fractary-forge agent-validate my-assistant
```

Output:
```
✓ Agent definition is valid
✓ Schema validation passed
```

### Step 4: Add Tools to Your Agent

Edit `.fractary/agents/my-assistant.yaml` to add tools:

```yaml
tools:
  - web-search
  - file-reader
```

Then validate again:

```bash
fractary-forge agent-validate my-assistant --check-tools
```

## Installing Plugins

Plugins are collections of pre-built agents, tools, and workflows.

### Browse Available Plugins

Search the registry for plugins:

```bash
fractary-forge search "coding"
```

### Install a Plugin

Install the FABER plugin (workflow management):

```bash
fractary-forge install @fractary/faber-plugin
```

Output:
```
Installing @fractary/faber-plugin@1.2.0...
✓ Downloaded plugin manifest
✓ Verified checksums
✓ Installed 5 agents
✓ Installed 12 tools
✓ Installed 3 workflows

Installation complete!
```

### List Installed Plugins

```bash
fractary-forge list
```

Output:
```
Installed Plugins:

Local (.fractary/):
  @fractary/faber-plugin@1.2.0
    5 agents, 12 tools, 3 workflows

Total: 1 plugin
```

### View Plugin Details

```bash
fractary-forge info @fractary/faber-plugin
```

### List Agents from Plugin

```bash
fractary-forge agent-list
```

You'll now see both your custom agent and the agents from the plugin.

## Working with Tools

Tools are functions that agents can use to perform specific tasks.

### Create a Simple Tool

Create `.fractary/tools/calculator.yaml`:

```yaml
name: calculator
type: tool
version: 1.0.0
description: Perform basic arithmetic calculations

parameters:
  type: object
  properties:
    operation:
      type: string
      enum: [add, subtract, multiply, divide]
      description: The operation to perform
    a:
      type: number
      description: First number
    b:
      type: number
      description: Second number
  required:
    - operation
    - a
    - b

implementation:
  type: function
  handler: ./handlers/calculator.js
```

### Use the Tool in an Agent

Update your agent to use the calculator:

```bash
fractary-forge agent-create math-assistant \
  --description "Assistant for math problems" \
  --tools "calculator" \
  --prompt "You are a math tutor. Use the calculator tool to help solve problems."
```

### Validate Tool References

```bash
fractary-forge agent-validate math-assistant --check-tools
```

## Forking and Customization

Fork existing agents to customize them while tracking upstream changes.

### Fork an Agent

```bash
fractary-forge fork @fractary/base-assistant --name my-custom-assistant
```

### Customize the Fork

Edit `.fractary/agents/my-custom-assistant.yaml` to add your customizations.

### Check for Upstream Updates

```bash
fractary-forge update --dry-run
```

### Merge Upstream Changes

```bash
fractary-forge merge
```

## Version Locking

Lock your dependencies to ensure consistent environments.

### Generate Lockfile

```bash
fractary-forge lock
```

This creates `.fractary/forge/lockfile.json` with exact versions and integrity hashes.

### Install from Lockfile

When team members clone your project, they can install exact versions:

```bash
fractary-forge install
```

## Exporting to Other Formats

Export your agents to various frameworks.

### Export to LangChain (Python)

```typescript
import { Exporters } from '@fractary/forge';

await Exporters.exporter.export(
  { agents: [myAgent] },
  { format: 'langchain', outputDir: './langchain-export' }
);
```

### Export to Claude Code

```typescript
await Exporters.exporter.export(
  { agents: [myAgent] },
  { format: 'claude', outputDir: './claude-export' }
);
```

### Export to n8n

```typescript
await Exporters.exporter.export(
  { agents: [myAgent] },
  { format: 'n8n', outputDir: './n8n-export' }
);
```

## Using the MCP Server

Integrate Forge with AI assistants like Claude Code.

### Configure Claude Desktop

Add to `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "forge": {
      "command": "fractary-forge-mcp",
      "args": []
    }
  }
}
```

### Available MCP Tools

Once configured, Claude can:
- Query agents: `fractary_forge_agent_list`, `fractary_forge_agent_info`
- Query tools: `fractary_forge_tool_list`, `fractary_forge_tool_info`
- Query plugins: `fractary_forge_plugin_list`, `fractary_forge_plugin_search`
- Manage cache: `fractary_forge_cache_stats`, `fractary_forge_cache_clear`
- Check forks: `fractary_forge_fork_list`, `fractary_forge_fork_diff`

## Common Workflows

### Workflow 1: Create and Share a Plugin

```bash
# 1. Create agents and tools
fractary-forge agent-create my-agent
fractary-forge tool-create my-tool

# 2. Test locally
fractary-forge agent-validate my-agent --check-tools

# 3. Lock versions
fractary-forge lock

# 4. Publish to registry (future feature)
fractary-forge publish
```

### Workflow 2: Install and Customize

```bash
# 1. Install base plugin
fractary-forge install @fractary/base-agents

# 2. Fork an agent
fractary-forge fork @fractary/base-assistant --name my-assistant

# 3. Customize
vim .fractary/agents/my-assistant.yaml

# 4. Track upstream
fractary-forge update --dry-run
```

### Workflow 3: Team Collaboration

```bash
# Team member 1:
fractary-forge init --org mycompany
fractary-forge agent-create shared-agent
fractary-forge lock
git add .fractary/
git commit -m "Add shared agent"
git push

# Team member 2:
git pull
fractary-forge install  # Installs from lockfile
fractary-forge agent-list  # See shared-agent
```

## Configuration

### Project Configuration

Edit `.fractary/forge/config.yaml`:

```yaml
organization: myorg

registry:
  local:
    enabled: true
    agents_path: .fractary/agents
    tools_path: .fractary/tools
  global:
    enabled: true
    path: ~/.fractary/registry

lockfile:
  path: .fractary/forge/lockfile.json
  auto_generate: true

defaults:
  agent:
    model:
      provider: anthropic
      name: claude-sonnet-4
```

### Global Configuration

Edit `~/.fractary/config.yaml` for global settings.

## Next Steps

Now that you're familiar with the basics, explore:

1. **[Command Reference](./command-reference.md)** - Complete CLI command documentation
2. **[Workflow Guides](./workflow-guides.md)** - Advanced workflows and patterns
3. **[API Reference](./api-reference.md)** - SDK API for programmatic access
4. **[Configuration Guide](./configuration.md)** - Detailed configuration options
5. **[Examples](../examples/)** - Code examples and templates

## Getting Help

- **Documentation**: [https://developers.fractary.com/forge](https://developers.fractary.com/forge)
- **Issues**: [GitHub Issues](https://github.com/fractary/forge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fractary/forge/discussions)
- **Email**: support@fractary.com

## Quick Reference Card

```bash
# Initialize
fractary-forge init --org myorg

# Create agent
fractary-forge agent-create my-agent --description "My agent"

# Install plugin
fractary-forge install @fractary/plugin-name

# List components
fractary-forge agent-list
fractary-forge list

# Fork and customize
fractary-forge fork @plugin/agent --name my-version

# Lock versions
fractary-forge lock

# Update plugins
fractary-forge update

# Cache management
fractary-forge cache stats
fractary-forge cache clear --all
```

Happy building with Fractary Forge!
