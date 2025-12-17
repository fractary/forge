# @fractary/forge-mcp

MCP (Model Context Protocol) server for Fractary Forge, exposing read-focused operations for agents, tools, plugins, configuration, cache, and forks.

## Overview

This MCP server provides **18 read-focused tools** that allow AI clients to query the Forge ecosystem without requiring direct CLI access or project context. All operations are stateless and query-based, making them ideal for integration with AI assistants like Claude.

### Key Features

- **18 Query Tools** - Comprehensive read-only access to Forge ecosystem
- **Stateless Design** - No project context required, works from anywhere
- **3-Tier Resolution** - Query local, global, or remote (Stockyard) resources
- **Type-Safe** - Full TypeScript support with Zod validation
- **Fast** - 5-6x faster than CLI subprocess calls (per SPEC-00026 benchmarks)
- **Standards-Compliant** - Follows MCP specification and SPEC-00026 conventions

## Installation

### Global Installation

```bash
npm install -g @fractary/forge-mcp
```

### Local Development

```bash
cd forge/mcp/server
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

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

After configuration, restart Claude Desktop. The tools will be available automatically.

### With Other MCP Clients

The server communicates via stdio and follows the MCP specification:

```bash
fractary-forge-mcp
```

### Programmatic Usage

```typescript
import { createServer, startServer } from '@fractary/forge-mcp';

// Start the MCP server
await startServer();

// Or create and configure manually
const server = createServer();
// ... configure transport
```

## Available Tools

### Agent Tools (3)

Query and validate agent definitions across local and global locations.

#### `fractary_forge_agent_list`
List available agents with optional filtering.

**Parameters:**
- `location`: `"local" | "global" | "all"` (default: `"all"`)
- `tags`: `string[]` (optional) - Filter by tags
- `limit`: `number` (optional) - Limit results

**Example:**
```typescript
{
  "location": "all",
  "tags": ["llm", "chat"],
  "limit": 10
}
```

#### `fractary_forge_agent_info`
Get detailed information about a specific agent.

**Parameters:**
- `name`: `string` - Agent name or reference (e.g., `"my-agent"` or `"@plugin/agent"`)

**Example:**
```typescript
{
  "name": "code-reviewer"
}
```

#### `fractary_forge_agent_validate`
Validate an agent definition file against the schema.

**Parameters:**
- `path`: `string` - Absolute path to agent YAML file

**Example:**
```typescript
{
  "path": "/path/to/agent.yaml"
}
```

### Tool Tools (3)

Query and validate tool definitions.

#### `fractary_forge_tool_list`
List available tools with optional filtering.

**Parameters:**
- `location`: `"local" | "global" | "all"` (default: `"all"`)
- `tags`: `string[]` (optional)
- `limit`: `number` (optional)

#### `fractary_forge_tool_info`
Get detailed information about a specific tool.

**Parameters:**
- `name`: `string` - Tool name or reference

#### `fractary_forge_tool_validate`
Validate a tool definition file.

**Parameters:**
- `path`: `string` - Absolute path to tool YAML file

### Plugin Tools (3)

Query installed plugins and search the Stockyard registry.

#### `fractary_forge_plugin_list`
List installed plugins.

**Parameters:**
- `location`: `"local" | "global" | "all"` (default: `"all"`)

**Returns:** Plugin list with version, description, and component counts

#### `fractary_forge_plugin_info`
Get detailed information about a specific plugin.

**Parameters:**
- `name`: `string` - Plugin name

**Returns:** Plugin manifest with agents, tools, commands, hooks counts

#### `fractary_forge_plugin_search`
Search the Stockyard registry for available plugins.

**Parameters:**
- `query`: `string` - Search query
- `tags`: `string[]` (optional)
- `limit`: `number` (default: 20)

**Note:** Requires configured Stockyard registry access.

### Config Tools (3)

Query Forge configuration at local, global, or merged levels.

#### `fractary_forge_config_get`
Get a specific configuration value by key.

**Parameters:**
- `key`: `string` - Configuration key (dot notation supported, e.g., `"registries.0.url"`)

**Example:**
```typescript
{
  "key": "registries.0.name"
}
```

#### `fractary_forge_config_show`
Show full configuration.

**Parameters:**
- `scope`: `"local" | "global" | "merged"` (default: `"merged"`)

#### `fractary_forge_config_registry_list`
List all configured registries.

**Returns:** Array of registries with name, url, priority, enabled status

### Cache Tools (2)

Manage the manifest cache.

#### `fractary_forge_cache_stats`
Get cache statistics.

**Returns:**
```typescript
{
  totalEntries: number;
  freshEntries: number;
  expiredEntries: number;
  totalSize: number;
  totalSizeReadable: string;  // e.g., "2.5 MB"
  cacheDir: string;
}
```

#### `fractary_forge_cache_clear`
Clear cache entries.

**Parameters:**
- `all`: `boolean` (default: `false`) - Clear all entries
- `pattern`: `string` (optional) - Registry name to clear

**Examples:**
```typescript
// Clear all cache
{ "all": true }

// Clear specific registry
{ "pattern": "stockyard-main" }
```

### Fork Tools (4)

Query forked assets and their relationship to upstream sources.

#### `fractary_forge_fork_list`
List all forked assets.

**Parameters:**
- `location`: `"local" | "global" | "all"` (default: `"all"`)
- `type`: `"agent" | "tool" | "plugin"` (optional)

#### `fractary_forge_fork_info`
Get detailed information about a forked asset.

**Parameters:**
- `name`: `string` - Asset name
- `type`: `"agent" | "tool" | "plugin"`

**Returns:** Fork metadata including upstream source, version, and local changes

#### `fractary_forge_fork_diff`
Show differences between local fork and upstream version.

**Parameters:**
- `name`: `string` - Asset name
- `type`: `"agent" | "tool" | "plugin"`

**Note:** Requires registry access to fetch upstream version.

#### `fractary_forge_fork_check`
Check if upstream version has updates available.

**Parameters:**
- `name`: `string` - Asset name
- `type`: `"agent" | "tool" | "plugin"`

**Note:** Requires registry access.

## Architecture

### Design Principles

The server follows the distributed plugin architecture defined in [SPEC-00026](../../specs/SPEC-00026-distributed-plugin-architecture.md):

1. **Read-Focused Operations Only**
   - No mutations (install, uninstall, create, delete)
   - Safe for concurrent access
   - Mutations handled by CLI

2. **Stateless Design**
   - No session management
   - No project context required
   - Each request is independent

3. **3-Tier Resolution**
   - **Local**: `.fractary/` in project directory
   - **Global**: `~/.fractary/registry/`
   - **Stockyard**: Remote registry (when configured)

4. **Input Validation**
   - Zod schemas for all tool parameters
   - Type-safe operations
   - Clear error messages

5. **Error Handling**
   - Standardized error formatting
   - Graceful degradation
   - Helpful error messages

### Performance

Based on SPEC-00026 benchmarks:
- **5-6x faster** than CLI subprocess calls
- **Persistent process** - no startup overhead per request
- **Shared cache** - efficient manifest caching

### Tool Naming Convention

All tools follow the pattern: `fractary_forge_{category}_{action}`

- `fractary` - Namespace
- `forge` - Product name
- `{category}` - Resource type (agent, tool, plugin, config, cache, fork)
- `{action}` - Operation (list, info, validate, get, show, stats, clear, diff, check)

## Development

### Prerequisites

- Node.js >= 18.0.0
- TypeScript >= 5.3.3
- @fractary/forge SDK

### Setup

```bash
cd forge/mcp/server
npm install
```

### Build

```bash
npm run build        # Production build
npm run dev          # Watch mode
npm run clean        # Clean build artifacts
```

### Testing

```bash
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage
```

### Code Quality

```bash
npm run lint         # Check linting
npm run lint:fix     # Fix linting issues
npm run format       # Format code
npm run typecheck    # Type checking
```

### Project Structure

```
mcp/server/
├── src/
│   ├── tools/              # Tool implementations
│   │   ├── agent.ts        # Agent query tools (3)
│   │   ├── tool.ts         # Tool query tools (3)
│   │   ├── plugin.ts       # Plugin query tools (3)
│   │   ├── config.ts       # Config tools (3)
│   │   ├── cache.ts        # Cache tools (2)
│   │   ├── fork.ts         # Fork tools (4)
│   │   └── index.ts        # Tool registry
│   ├── server.ts           # MCP server core
│   ├── types.ts            # Shared type definitions
│   └── index.ts            # Main entry point
├── bin/
│   └── fractary-forge-mcp.js  # Executable
├── dist/                   # Compiled output
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
└── CONTRIBUTING.md
```

## Troubleshooting

### Server Won't Start

1. Check Node.js version: `node --version` (must be >= 18.0.0)
2. Rebuild: `npm run build`
3. Check logs in Claude Desktop console

### Tools Not Appearing

1. Restart Claude Desktop after configuration
2. Verify config file location and format
3. Check that `fractary-forge-mcp` is in PATH

### Tools Returning Errors

1. Ensure @fractary/forge SDK is installed
2. Check that Forge configuration exists
3. Verify file paths are absolute

### Cache Issues

Use `fractary_forge_cache_clear` with `{"all": true}` to reset cache.

## Related Packages

- **[@fractary/forge](../../../sdk/js)** - Core SDK for Forge operations
- **[@fractary/forge-cli](../../../cli)** - Command-line interface (includes mutations)
- **@modelcontextprotocol/sdk** - MCP SDK for TypeScript

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT

## Links

- [GitHub Repository](https://github.com/fractary/forge)
- [MCP Specification](https://modelcontextprotocol.io)
- [SPEC-00026: Distributed Plugin Architecture](../../specs/SPEC-00026-distributed-plugin-architecture.md)
- [SPEC-20251217: Forge MCP Server](../../specs/SPEC-20251217-forge-mcp-server.md)
- [Issue #15: Implementation Tracking](https://github.com/fractary/forge/issues/15)
