# Fractary Forge MCP Server

Complete guide for using the Fractary Forge Model Context Protocol (MCP) server.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Integration Guides](#integration-guides)
- [Troubleshooting](#troubleshooting)

## Overview

The Fractary Forge MCP server enables AI assistants (like Claude) to interact with the Forge system through the Model Context Protocol. This allows Claude to manage agents, tools, plugins, and more directly.

### What is MCP?

Model Context Protocol (MCP) is a standard protocol for AI assistants to access external tools and data sources. The Forge MCP server exposes Forge functionality as MCP tools.

### Features

- **Agent Management**: List, get, create, and validate agents
- **Tool Management**: List and get tool definitions
- **Plugin Management**: Search, install, and list plugins
- **Cache Management**: View stats and clear cache
- **Resolution**: Resolve agents with dependencies

## Installation

### Global Installation

```bash
npm install -g @fractary/forge-mcp
```

### Local Installation

```bash
npm install @fractary/forge-mcp
```

### Verify Installation

```bash
# Global
forge-mcp --version

# Local
npx forge-mcp --version
```

## Configuration

### Claude Desktop Configuration

Add the MCP server to Claude Desktop's configuration file.

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "forge": {
      "command": "npx",
      "args": ["-y", "@fractary/forge-mcp"],
      "env": {
        "FORGE_CONFIG_PATH": "/path/to/.fractary/forge.config.json",
        "FORGE_CACHE_DIR": "/path/to/.fractary/cache",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FORGE_CONFIG_PATH` | Path to Forge configuration | `.fractary/forge.config.json` |
| `FORGE_CACHE_DIR` | Cache directory | `~/.fractary/cache` |
| `LOG_LEVEL` | Logging level | `info` |
| `FORGE_REGISTRY_URL` | Default registry URL | Fractary official registry |

### Forge Configuration

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

## Available Tools

### Agent Tools

#### forge_agent_list

List all available agents.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "enum": ["local", "global", "remote"],
      "description": "Filter by source"
    },
    "tag": {
      "type": "string",
      "description": "Filter by tag"
    }
  }
}
```

**Example:**
```json
{
  "source": "local"
}
```

**Output:**
```json
{
  "agents": [
    {
      "name": "my-agent",
      "version": "1.0.0",
      "source": "local",
      "description": "My custom agent",
      "tags": ["assistant"]
    }
  ],
  "total": 1
}
```

#### forge_agent_get

Get detailed information about an agent.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Agent name"
    },
    "version": {
      "type": "string",
      "description": "Specific version (optional)"
    },
    "includeTools": {
      "type": "boolean",
      "description": "Include tool definitions",
      "default": false
    }
  },
  "required": ["name"]
}
```

**Example:**
```json
{
  "name": "my-agent",
  "includeTools": true
}
```

**Output:**
```json
{
  "name": "my-agent",
  "version": "1.0.0",
  "type": "agent",
  "description": "My custom agent",
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.7,
    "maxTokens": 4096
  },
  "systemPrompt": "You are a helpful assistant...",
  "tools": ["web-search", "file-reader"],
  "tags": ["assistant"]
}
```

#### forge_agent_create

Create a new agent definition.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Agent name"
    },
    "version": {
      "type": "string",
      "description": "Version (semver)",
      "default": "1.0.0"
    },
    "description": {
      "type": "string",
      "description": "Agent description"
    },
    "llm": {
      "type": "object",
      "properties": {
        "provider": {
          "type": "string",
          "enum": ["anthropic", "openai", "google"]
        },
        "model": {
          "type": "string"
        },
        "temperature": {
          "type": "number",
          "default": 0.7
        }
      },
      "required": ["provider", "model"]
    },
    "systemPrompt": {
      "type": "string",
      "description": "System prompt"
    },
    "tools": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of tools"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": ["name", "llm", "systemPrompt"]
}
```

**Example:**
```json
{
  "name": "my-new-agent",
  "description": "A new agent",
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.7
  },
  "systemPrompt": "You are a helpful assistant.",
  "tools": ["web-search"],
  "tags": ["assistant"]
}
```

**Output:**
```json
{
  "name": "my-new-agent",
  "version": "1.0.0",
  "path": ".fractary/agents/my-new-agent.md",
  "created": true
}
```

#### forge_agent_validate

Validate an agent definition.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Agent name"
    }
  },
  "required": ["name"]
}
```

**Output:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

### Tool Tools

#### forge_tool_list

List all available tools.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "enum": ["local", "global", "remote"]
    },
    "tag": {
      "type": "string"
    }
  }
}
```

#### forge_tool_get

Get detailed information about a tool.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Tool name"
    },
    "version": {
      "type": "string"
    }
  },
  "required": ["name"]
}
```

**Output:**
```json
{
  "name": "web-search",
  "version": "1.0.0",
  "type": "tool",
  "description": "Search the web",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query"
      }
    },
    "required": ["query"]
  },
  "implementation": {
    "type": "function",
    "handler": "./handlers/web-search.js"
  }
}
```

### Plugin Tools

#### forge_plugin_list

List installed plugins.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "enum": ["local", "global"]
    }
  }
}
```

**Output:**
```json
{
  "plugins": [
    {
      "name": "@fractary/faber-plugin",
      "version": "1.0.0",
      "source": "global",
      "components": {
        "agents": 5,
        "tools": 12,
        "workflows": 3
      }
    }
  ],
  "total": 1
}
```

#### forge_plugin_search

Search for plugins in registries.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query"
    },
    "tag": {
      "type": "string"
    },
    "limit": {
      "type": "number",
      "default": 20
    }
  },
  "required": ["query"]
}
```

**Example:**
```json
{
  "query": "faber",
  "limit": 10
}
```

**Output:**
```json
{
  "results": [
    {
      "name": "@fractary/faber-plugin",
      "version": "1.0.0",
      "description": "FABER workflow plugin",
      "registry": "fractary-core",
      "tags": ["workflow", "faber"]
    }
  ],
  "total": 1
}
```

#### forge_plugin_install

Install a plugin.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Plugin name"
    },
    "version": {
      "type": "string"
    },
    "global": {
      "type": "boolean",
      "default": false
    },
    "force": {
      "type": "boolean",
      "default": false
    },
    "agentsOnly": {
      "type": "boolean",
      "default": false
    },
    "toolsOnly": {
      "type": "boolean",
      "default": false
    }
  },
  "required": ["name"]
}
```

**Example:**
```json
{
  "name": "@fractary/faber-plugin",
  "global": true
}
```

**Output:**
```json
{
  "plugin": {
    "name": "@fractary/faber-plugin",
    "version": "1.0.0"
  },
  "installed": {
    "agents": 5,
    "tools": 12,
    "workflows": 3
  },
  "path": "~/.fractary/registry/plugins/@fractary/faber-plugin"
}
```

### Cache Tools

#### forge_cache_stats

Get cache statistics.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {}
}
```

**Output:**
```json
{
  "totalEntries": 42,
  "freshEntries": 38,
  "staleEntries": 4,
  "totalSize": 15728640,
  "oldestEntry": "2025-12-16T10:00:00Z",
  "newestEntry": "2025-12-17T15:30:00Z"
}
```

#### forge_cache_clear

Clear cache entries.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "pattern": {
      "type": "string",
      "description": "Pattern to match (optional)"
    },
    "staleOnly": {
      "type": "boolean",
      "default": false
    }
  }
}
```

**Example:**
```json
{
  "pattern": "@fractary/*",
  "staleOnly": false
}
```

**Output:**
```json
{
  "cleared": 12,
  "totalSize": 5242880
}
```

### Resolution Tool

#### forge_resolve

Resolve an asset with dependencies.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Asset name"
    },
    "type": {
      "type": "string",
      "enum": ["agent", "tool", "workflow"]
    },
    "version": {
      "type": "string"
    },
    "includeDependencies": {
      "type": "boolean",
      "default": true
    }
  },
  "required": ["name", "type"]
}
```

**Example:**
```json
{
  "name": "my-agent",
  "type": "agent",
  "includeDependencies": true
}
```

**Output:**
```json
{
  "name": "my-agent",
  "version": "1.0.0",
  "type": "agent",
  "source": "local",
  "dependencies": {
    "tools": [
      {
        "name": "web-search",
        "version": "1.0.0"
      },
      {
        "name": "file-reader",
        "version": "1.0.0"
      }
    ]
  }
}
```

## Usage Examples

### Example 1: List Available Agents

**User:** "List all my local agents"

**Claude's Tool Use:**
```json
{
  "name": "forge_agent_list",
  "input": {
    "source": "local"
  }
}
```

**Response:**
```
I found 3 local agents:

1. **my-assistant** (v1.0.0)
   - A helpful AI assistant
   - Tags: assistant, general

2. **code-reviewer** (v1.0.0)
   - Reviews code for quality and best practices
   - Tags: code, review

3. **data-analyst** (v1.0.0)
   - Analyzes data and generates insights
   - Tags: data, analysis
```

### Example 2: Get Agent Details

**User:** "Show me details about my-assistant"

**Claude's Tool Use:**
```json
{
  "name": "forge_agent_get",
  "input": {
    "name": "my-assistant",
    "includeTools": true
  }
}
```

**Response:**
```
**my-assistant** (v1.0.0)

Description: A helpful AI assistant

LLM Configuration:
- Provider: anthropic
- Model: claude-3-5-sonnet-20241022
- Temperature: 0.7

Tools:
- web-search
- file-reader

System Prompt:
"You are a helpful AI assistant that can search the web and read files..."
```

### Example 3: Install a Plugin

**User:** "Install the FABER plugin"

**Claude's Tool Use:**
```json
[
  {
    "name": "forge_plugin_search",
    "input": {
      "query": "faber",
      "limit": 5
    }
  }
]
```

Then:
```json
{
  "name": "forge_plugin_install",
  "input": {
    "name": "@fractary/faber-plugin",
    "global": true
  }
}
```

**Response:**
```
I found the FABER plugin and installed it successfully!

**@fractary/faber-plugin** (v1.0.0)

Installed components:
- 5 agents (faber-planner, faber-architect, faber-builder, faber-evaluator, faber-releaser)
- 12 tools
- 3 workflows

The plugin has been installed globally at:
~/.fractary/registry/plugins/@fractary/faber-plugin
```

### Example 4: Create New Agent

**User:** "Create a new agent called 'research-assistant' that can search the web and read files"

**Claude's Tool Use:**
```json
{
  "name": "forge_agent_create",
  "input": {
    "name": "research-assistant",
    "description": "A research assistant that can search the web and read files",
    "llm": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "temperature": 0.7,
      "maxTokens": 4096
    },
    "systemPrompt": "You are a research assistant. Your goal is to help users find and analyze information from the web and local files. Be thorough in your research and cite sources.",
    "tools": ["web-search", "file-reader"],
    "tags": ["research", "assistant"]
  }
}
```

**Response:**
```
I've created the research-assistant agent!

**research-assistant** (v1.0.0)

Description: A research assistant that can search the web and read files

Configuration:
- Model: claude-3-5-sonnet-20241022
- Temperature: 0.7
- Tools: web-search, file-reader

The agent definition has been saved to:
.fractary/agents/research-assistant.md

You can now use this agent in your project!
```

## Integration Guides

### Using with Claude Desktop

1. Install the MCP server
2. Configure in `claude_desktop_config.json`
3. Restart Claude Desktop
4. Ask Claude to use Forge tools

Example conversation:
```
User: Can you list my agents using Forge?

Claude: I'll use the Forge MCP server to list your agents.
[Uses forge_agent_list tool]
I found 3 agents in your local .fractary directory...
```

### Using with Other MCP Clients

The Forge MCP server works with any MCP-compatible client:

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@fractary/forge-mcp'],
  env: {
    FORGE_CONFIG_PATH: '/path/to/config.json'
  }
});

const client = new Client({
  name: 'my-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Use a tool
const result = await client.callTool('forge_agent_list', {
  source: 'local'
});
console.log('Agents:', result);
```

## Troubleshooting

### MCP Server Not Starting

**Symptom:** Claude Desktop shows "MCP server failed to start"

**Solutions:**
1. Check logs in Claude Desktop
2. Verify `forge-mcp` is installed:
   ```bash
   npx @fractary/forge-mcp --version
   ```
3. Check configuration path is valid
4. Ensure permissions on config file

### Tools Not Appearing

**Symptom:** Forge tools don't show up in Claude

**Solutions:**
1. Restart Claude Desktop
2. Check `claude_desktop_config.json` syntax
3. Verify MCP server configuration
4. Check Claude Desktop logs

### Permission Errors

**Symptom:** "EACCES: permission denied"

**Solutions:**
1. Check file permissions:
   ```bash
   ls -la .fractary/
   ```
2. Ensure write permissions:
   ```bash
   chmod -R 755 .fractary/
   ```

### Cache Issues

**Symptom:** Stale data being returned

**Solutions:**
1. Clear cache:
   - Ask Claude: "Clear the Forge cache"
   - Or manually: `rm -rf ~/.fractary/cache/`
2. Adjust TTL in configuration

### Network Errors

**Symptom:** "Failed to fetch from registry"

**Solutions:**
1. Check internet connection
2. Verify registry URL in configuration
3. Check firewall settings
4. Try with different registry

## Advanced Configuration

### Custom Resolvers

```json
{
  "resolvers": {
    "custom": {
      "type": "database",
      "connection": "postgresql://localhost/forge"
    }
  }
}
```

### Multiple Registries

```json
{
  "resolvers": {
    "remote": {
      "registries": [
        {
          "name": "company-internal",
          "url": "https://internal.company.com/registry.json",
          "priority": 1,
          "auth": {
            "type": "token",
            "token": "${COMPANY_REGISTRY_TOKEN}"
          }
        },
        {
          "name": "fractary-core",
          "url": "https://raw.githubusercontent.com/fractary/plugins/main/registry.json",
          "priority": 2
        }
      ]
    }
  }
}
```

### Logging

Set `LOG_LEVEL` environment variable:

```json
{
  "mcpServers": {
    "forge": {
      "command": "npx",
      "args": ["-y", "@fractary/forge-mcp"],
      "env": {
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

Levels: `error`, `warn`, `info`, `debug`

## Next Steps

- Explore [Examples](./examples/basic-usage.md)
- Read [API Reference](./API.md)
- Check out [Architecture](./ARCHITECTURE.md)
