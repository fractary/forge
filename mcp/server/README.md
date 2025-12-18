# @fractary/forge-mcp

> **Model Context Protocol server for Fractary Forge**

Connect Claude Desktop to your Forge agents, tools, and plugins via MCP.

[![npm version](https://img.shields.io/npm/v/@fractary/forge-mcp)](https://www.npmjs.com/package/@fractary/forge-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- **18 MCP Tools** - Comprehensive access to Forge ecosystem
- **Agent Management** - List, get, create, validate agents
- **Tool Management** - Access tool definitions
- **Plugin Management** - Search, install, manage plugins
- **Cache Control** - View stats and clear cache
- **Resolution** - Resolve components with dependencies
- **Stateless Design** - Works from anywhere, no project context required
- **Fast Performance** - 5-6x faster than CLI subprocess calls

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g @fractary/forge-mcp
```

### Verify Installation

```bash
forge-mcp --version
```

## 🚀 Quick Start

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "forge": {
      "command": "npx",
      "args": ["-y", "@fractary/forge-mcp"],
      "env": {
        "FORGE_CONFIG_PATH": "/path/to/.fractary/forge.config.json",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Restart Claude Desktop

After configuration, restart Claude Desktop to load the MCP server.

### Verify Installation

Ask Claude:
```
Can you list my Forge agents?
```

Claude will use the `forge_agent_list` tool to show your agents.

## 🛠️ Available Tools

### Agent Tools

| Tool | Description |
|------|-------------|
| **forge_agent_list** | List all available agents |
| **forge_agent_get** | Get detailed agent information |
| **forge_agent_create** | Create new agent definition |
| **forge_agent_validate** | Validate agent definition |

### Tool Tools

| Tool | Description |
|------|-------------|
| **forge_tool_list** | List all available tools |
| **forge_tool_get** | Get detailed tool information |

### Plugin Tools

| Tool | Description |
|------|-------------|
| **forge_plugin_list** | List installed plugins |
| **forge_plugin_search** | Search for plugins in registries |
| **forge_plugin_install** | Install a plugin |

### Cache Tools

| Tool | Description |
|------|-------------|
| **forge_cache_stats** | Get cache statistics |
| **forge_cache_clear** | Clear cache entries |

### Resolution Tool

| Tool | Description |
|------|-------------|
| **forge_resolve** | Resolve asset with dependencies |

## 💡 Usage Examples

### Example 1: List Agents

**User:** "List all my local agents"

**Claude uses:** `forge_agent_list` with `{ "source": "local" }`

**Result:**
```
I found 3 local agents:

1. my-assistant (v1.0.0)
   - A helpful AI assistant
   - Tools: web-search, file-reader

2. code-reviewer (v1.0.0)
   - Reviews code for quality
   - Tools: code-analyzer

3. data-analyst (v1.0.0)
   - Analyzes data and generates insights
   - Tools: data-processor, chart-generator
```

### Example 2: Get Agent Details

**User:** "Show me details about my-assistant"

**Claude uses:** `forge_agent_get` with `{ "name": "my-assistant", "includeTools": true }`

**Result:**
```
my-assistant (v1.0.0)

Description: A helpful AI assistant

LLM Configuration:
- Provider: anthropic
- Model: claude-3-5-sonnet-20241022
- Temperature: 0.7

Tools:
- web-search: Search the web for information
- file-reader: Read and analyze files

System Prompt:
"You are a helpful AI assistant..."
```

### Example 3: Install Plugin

**User:** "Install the FABER plugin"

**Claude uses:**
1. `forge_plugin_search` with `{ "query": "faber" }`
2. `forge_plugin_install` with `{ "name": "@fractary/faber-plugin", "global": true }`

**Result:**
```
I found and installed the FABER plugin!

@fractary/faber-plugin (v1.0.0)

Installed:
- 5 agents
- 12 tools
- 3 workflows

Location: ~/.fractary/registry/plugins/@fractary/faber-plugin
```

### Example 4: Create Agent

**User:** "Create a research assistant agent"

**Claude uses:** `forge_agent_create` with appropriate parameters

**Result:**
```
Created research-assistant agent!

Agent: research-assistant (v1.0.0)
Description: A research assistant for finding and analyzing information
Model: claude-3-5-sonnet-20241022
Tools: web-search, file-reader

Saved to: .fractary/agents/research-assistant.md
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FORGE_CONFIG_PATH` | Path to Forge config | `.fractary/forge.config.json` |
| `FORGE_CACHE_DIR` | Cache directory | `~/.fractary/cache` |
| `LOG_LEVEL` | Logging level | `info` |

### Forge Configuration

Create `.fractary/forge.config.json`:

```json
{
  "version": "1.0.0",
  "resolvers": {
    "local": {
      "enabled": true,
      "paths": [".fractary/agents", ".fractary/tools"]
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
    "ttl": 3600
  }
}
```

## 🔧 Advanced Usage

### Multiple Registries

```json
{
  "mcpServers": {
    "forge": {
      "command": "npx",
      "args": ["-y", "@fractary/forge-mcp"],
      "env": {
        "FORGE_CONFIG_PATH": "/path/to/config.json"
      }
    }
  }
}
```

Then configure multiple registries in `forge.config.json`:

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

### Custom Logging

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

## 🐛 Troubleshooting

### MCP Server Not Starting

**Symptom:** Claude shows "MCP server failed to start"

**Solutions:**
1. Check logs in Claude Desktop Developer Tools
2. Verify installation:
   ```bash
   npx @fractary/forge-mcp --version
   ```
3. Check config file syntax in `claude_desktop_config.json`
4. Ensure permissions on config files

### Tools Not Appearing

**Symptom:** Forge tools don't show in Claude

**Solutions:**
1. Restart Claude Desktop completely
2. Verify MCP server configuration
3. Check Claude Desktop logs
4. Try using `forge-mcp` instead of `npx @fractary/forge-mcp` if globally installed

### Permission Errors

**Symptom:** "EACCES: permission denied"

**Solutions:**
```bash
# Check permissions
ls -la .fractary/

# Fix permissions
chmod -R 755 .fractary/
```

### Cache Issues

**Symptom:** Stale data returned

**Solutions:**
- Ask Claude: "Clear the Forge cache"
- Or manually: `rm -rf ~/.fractary/cache/`
- Adjust TTL in configuration

### Network Errors

**Symptom:** "Failed to fetch from registry"

**Solutions:**
1. Check internet connection
2. Verify registry URL in config
3. Check firewall settings
4. Try different registry

## 📖 Documentation

- **[Complete Documentation](../../docs/README.md)** - Full documentation index
- **[MCP Server Guide](../../docs/MCP_SERVER.md)** - Detailed MCP guide
- **[Getting Started](../../docs/guides/getting-started.md)** - Quick start guide
- **[API Reference](../../docs/API.md)** - API documentation

## 🛠️ Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/fractary/forge.git
cd forge/mcp/server

# Install dependencies
npm install

# Build
npm run build

# Link globally for testing
npm link

# Test
forge-mcp --version
```

### Testing

```bash
npm test
```

See [Developer Guide](../../docs/DEVELOPER.md) for contribution guidelines.

## 📊 Performance

Based on SPEC-00026 benchmarks:

- **5-6x faster** than CLI subprocess calls
- **Stateless** - no context switching overhead
- **Efficient** - direct SDK access
- **Cached** - TTL-based caching for registries

## 🏗️ Architecture

```
Claude Desktop
      │
      ▼
MCP Protocol
      │
      ▼
@fractary/forge-mcp
      │
      ▼
@fractary/forge (SDK)
      │
      ▼
Resolution Manager
├── Local (.fractary/)
├── Global (~/.fractary/registry/)
└── Remote (registries)
```

## 📄 License

MIT © [Fractary](https://fractary.com)

## 🔗 Links

- **[GitHub](https://github.com/fractary/forge)** - Source code
- **[NPM](https://www.npmjs.com/package/@fractary/forge-mcp)** - Package registry
- **[Documentation](../../docs/README.md)** - Full documentation
- **[SDK Package](../../sdk/js/)** - Core SDK
- **[CLI Tool](../../cli/)** - Command-line interface
- **[Issues](https://github.com/fractary/forge/issues)** - Bug reports

## 🤝 Related Packages

- **[@fractary/forge](../../sdk/js/)** - Core SDK
- **[@fractary/forge-cli](../../cli/)** - Command-line interface

## 🌟 Using with Other MCP Clients

While designed for Claude Desktop, the server works with any MCP-compatible client:

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@fractary/forge-mcp']
});

const client = new Client({
  name: 'my-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List tools
const tools = await client.listTools();

// Use tool
const result = await client.callTool('forge_agent_list', {
  source: 'local'
});
```

---

**Made with ❤️ by the Fractary team**
