# Basic Usage Examples

This guide provides practical examples for getting started with Fractary Forge.

## Table of Contents

- [Creating Your First Agent](#creating-your-first-agent)
- [Working with Tools](#working-with-tools)
- [Installing Plugins](#installing-plugins)
- [Using the SDK](#using-the-sdk)
- [Using the MCP Server](#using-the-mcp-server)

## Creating Your First Agent

### Using the CLI

```bash
# Initialize Forge in your project
fractary-forge init

# Create a new agent
fractary-forge agent-create my-assistant

# This creates: .fractary/agents/my-assistant.md
```

### Agent Definition (Markdown Frontmatter)

```markdown
---
name: my-assistant
version: 1.0.0
type: agent
description: A helpful AI assistant for general tasks
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  temperature: 0.7
  max_tokens: 4096
tools:
  - web-search
  - file-reader
tags:
  - assistant
  - general
---

# System Prompt

You are a helpful AI assistant that can search the web and read files.
Your goal is to provide accurate, helpful information to users.

## Guidelines

- Be concise and clear
- Cite sources when using web search
- Ask clarifying questions when needed
```

### Validating Your Agent

```bash
# Validate the agent definition
fractary-forge agent-validate my-assistant

# Output:
# ✓ Agent 'my-assistant' is valid
# ✓ All required tools are available
```

## Working with Tools

### Creating a Custom Tool

```bash
# Create a new tool definition
fractary-forge tool-create calculator
```

### Tool Definition Example

```markdown
---
name: calculator
version: 1.0.0
type: tool
description: Performs basic arithmetic operations
parameters:
  type: object
  properties:
    operation:
      type: string
      enum: [add, subtract, multiply, divide]
      description: The arithmetic operation to perform
    a:
      type: number
      description: First operand
    b:
      type: number
      description: Second operand
  required:
    - operation
    - a
    - b
implementation:
  type: function
  handler: ./handlers/calculator.js
tags:
  - math
  - utility
---

# Calculator Tool

Performs basic arithmetic operations on two numbers.

## Examples

```json
{
  "operation": "add",
  "a": 5,
  "b": 3
}
// Returns: 8
```
```

### Tool Implementation

Create the handler file at `.fractary/tools/handlers/calculator.js`:

```javascript
/**
 * Calculator tool implementation
 */
export async function handler(params) {
  const { operation, a, b } = params;

  switch (operation) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
    case 'divide':
      if (b === 0) {
        throw new Error('Division by zero');
      }
      return a / b;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
```

## Installing Plugins

### From Registry

```bash
# Search for plugins
fractary-forge search faber

# Install a plugin globally
fractary-forge install @fractary/faber-plugin --global

# Install a plugin locally (project-specific)
fractary-forge install @fractary/faber-plugin

# Install with specific components
fractary-forge install @fractary/faber-plugin --agents-only
fractary-forge install @fractary/faber-plugin --tools-only
```

### Listing Installed Plugins

```bash
# List all installed plugins
fractary-forge list

# Output:
# Global Plugins:
#   @fractary/faber-plugin@1.0.0
#     - 5 agents
#     - 12 tools
#     - 3 workflows
#
# Local Plugins:
#   @fractary/custom-plugin@0.1.0
#     - 2 agents
#     - 3 tools
```

### Plugin Information

```bash
# Get detailed info about a plugin
fractary-forge info @fractary/faber-plugin

# Output:
# @fractary/faber-plugin@1.0.0
# Description: FABER workflow plugin for AI agents
#
# Components:
#   Agents (5):
#     - faber-planner
#     - faber-architect
#     - faber-builder
#     - faber-evaluator
#     - faber-releaser
#
#   Tools (12):
#     - file-reader
#     - file-writer
#     - code-analyzer
#     ...
```

## Using the SDK

### Basic SDK Usage

```typescript
import { ForgeClient } from '@fractary/forge';

// Initialize client
const client = new ForgeClient({
  configPath: '.fractary/forge.config.json'
});

// List available agents
const agents = await client.agents.list();
console.log('Available agents:', agents);

// Get agent definition
const agent = await client.agents.get('my-assistant');
console.log('Agent:', agent);

// Validate agent
const validation = await client.agents.validate('my-assistant');
if (validation.valid) {
  console.log('✓ Agent is valid');
} else {
  console.error('✗ Validation errors:', validation.errors);
}
```

### Resolving Dependencies

```typescript
import { ForgeClient } from '@fractary/forge';

const client = new ForgeClient();

// Resolve agent with all dependencies
const resolved = await client.resolve('my-assistant', {
  includeTools: true,
  includeWorkflows: true
});

console.log('Agent:', resolved.agent);
console.log('Tools:', resolved.tools);
console.log('Workflows:', resolved.workflows);
```

### Cache Management

```typescript
import { ForgeClient } from '@fractary/forge';

const client = new ForgeClient();

// Get cache statistics
const stats = await client.cache.getStats();
console.log('Cache entries:', stats.totalEntries);
console.log('Cache size:', stats.totalSize);

// Clear cache
await client.cache.clear();
console.log('Cache cleared');

// Clear specific entries
await client.cache.clear({ pattern: '@fractary/*' });
```

## Using the MCP Server

### Installing MCP Server

```bash
# Install MCP server globally
npm install -g @fractary/forge-mcp

# Or use in Claude Desktop directly
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "forge": {
      "command": "npx",
      "args": ["-y", "@fractary/forge-mcp"],
      "env": {
        "FORGE_CONFIG_PATH": "/path/to/.fractary/forge.config.json"
      }
    }
  }
}
```

### Available MCP Tools

The Forge MCP server provides these tools:

1. **forge_agent_list** - List all available agents
2. **forge_agent_get** - Get agent definition
3. **forge_agent_create** - Create new agent
4. **forge_agent_validate** - Validate agent
5. **forge_tool_list** - List all available tools
6. **forge_tool_get** - Get tool definition
7. **forge_plugin_list** - List installed plugins
8. **forge_plugin_install** - Install plugin
9. **forge_plugin_search** - Search for plugins
10. **forge_cache_stats** - Get cache statistics
11. **forge_cache_clear** - Clear cache
12. **forge_resolve** - Resolve agent with dependencies

### Using MCP Tools in Claude

```
User: List all available agents

Claude: [Uses forge_agent_list tool]
Available agents:
1. my-assistant (v1.0.0) - A helpful AI assistant
2. faber-planner (v1.0.0) - FABER workflow planner
3. code-reviewer (v1.0.0) - Code review agent

User: Get details for my-assistant

Claude: [Uses forge_agent_get tool]
Agent: my-assistant
Version: 1.0.0
Provider: anthropic
Model: claude-3-5-sonnet-20241022
Tools: web-search, file-reader
```

## Configuration

### Project Configuration

Create `.fractary/forge.config.json`:

```json
{
  "version": "1.0.0",
  "resolvers": {
    "local": {
      "enabled": true,
      "paths": [
        ".fractary/agents",
        ".fractary/tools",
        ".fractary/workflows"
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
          "type": "manifest",
          "url": "https://raw.githubusercontent.com/fractary/plugins/main/registry.json",
          "priority": 1
        }
      ]
    }
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "maxSize": "100MB"
  }
}
```

### Global Configuration

Create `~/.fractary/config.json`:

```json
{
  "registries": [
    {
      "name": "fractary-core",
      "url": "https://raw.githubusercontent.com/fractary/plugins/main/registry.json",
      "enabled": true
    }
  ],
  "cache": {
    "enabled": true,
    "ttl": 3600
  },
  "auth": {
    "tokens": {}
  }
}
```

## Next Steps

- Read the [Workflow Guides](../guides/workflow-guides.md) for advanced patterns
- Explore the [Command Reference](../guides/command-reference.md) for all CLI commands
- Check out the [API Reference](../API.md) for SDK documentation
- Learn about [Architecture](../ARCHITECTURE.md) to understand the system design
