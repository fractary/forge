# SPEC-20251217: Fractary Forge MCP Server

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Created** | 2025-12-17 |
| **Updated** | 2025-12-17 |
| **Author** | Claude (with human direction) |
| **Related** | SPEC-00026-distributed-plugin-architecture |

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-17 | 1.1 | Refined scope to read-focused operations; added tool management (3); removed auth tools (3); removed mutation tools (install, uninstall, init, etc.); added config_get; total 18 tools |
| 2025-12-17 | 1.0 | Initial specification |

## 1. Executive Summary

This specification defines the implementation of `@fractary/forge-mcp`, an MCP (Model Context Protocol) server that exposes **read-focused** Forge functionality as MCP tools. This enables universal tool access for querying agent/tool registries, searching plugins, validating definitions, and inspecting configuration across any MCP-compatible client.

**Design Decision**: MCP servers operate statelessly without project context. Operations that mutate state or require specific project paths (install, uninstall, init) remain CLI-only. The MCP server focuses on queries, searches, validation, and information retrieval.

### 1.1 Scope

This document covers:
- MCP server architecture and project structure
- Tool definitions for 18 read-focused operations
- Input/output schemas for each tool
- Configuration and deployment patterns
- Integration with existing `@fractary/forge` SDK

**In Scope (MCP)**:
- Agent queries: list, info, validate
- Tool queries: list, info, validate
- Plugin queries: list, info, search
- Registry queries: list configured registries
- Cache operations: stats, clear (stateless)
- Configuration: get current values
- Fork queries: check upstream status

**Out of Scope (CLI-only)**:
- Plugin installation/uninstallation (requires project context)
- Configuration initialization (creates project files)
- Lockfile generation (requires project context)
- Authentication (login/logout - handled via CLI/env vars)
- Fork creation (creates project files)

### 1.2 Design Goals

1. **Universal Access** - Works with Claude Code, LangChain, n8n, and any MCP client
2. **Performance** - Direct SDK calls (5-6x faster than CLI subprocess)
3. **Type Safety** - Full TypeScript types throughout
4. **Consistency** - Follows SPEC-00026 naming conventions
5. **Stateless Operations** - No project context required
6. **Read-Focused** - Query and validate, don't mutate

### 1.3 Key Deliverables

| Deliverable | Description |
|-------------|-------------|
| `@fractary/forge-mcp` | npm package exposing MCP server |
| 18 MCP Tools | Read-focused tool coverage |
| Configuration | Standard MCP server configuration |
| Documentation | README with usage examples |

## 2. Background & Motivation

### 2.1 Current Architecture

The Forge project currently provides:
- **`@fractary/forge`** - Core SDK for asset management with multi-resolver architecture
- **`@fractary/forge-cli`** - Command-line interface wrapping SDK functionality

Per SPEC-00026 (Distributed Plugin Architecture), each SDK should expose:
1. JavaScript SDK (complete)
2. CLI (complete)
3. **MCP Server** (this specification)

### 2.2 Why MCP Server?

From SPEC-00026 Section 3.11:

> MCP servers provide:
> 1. Universal tool access - Works with Claude Code, LangChain, n8n, and any MCP client
> 2. No framework lock-in - Fractary YAML definitions don't need framework-specific ports
> 3. Efficient integration - Direct function calls, no subprocess overhead
> 4. Streaming support - Can stream large responses
> 5. Stateful operations - Server maintains context across calls

**Performance comparison (from spec):**

| Operation | CLI Time | MCP Time | Speedup |
|-----------|----------|----------|---------|
| Single issue fetch | 800ms | 150ms | 5.3x faster |
| 10 operations | 8000ms | 1500ms | 5.3x faster |
| Branch + commit + PR | 2400ms | 450ms | 5.3x faster |
| Full FABER workflow | 30s | 8s | 3.75x faster |

### 2.3 Integration Strategy

The MCP server follows the "MCP-first, CLI-fallback" pattern from SPEC-00026:

```yaml
# Plugin can use MCP (efficient) or CLI (fallback)
mcp:
  server: fractary-forge
  tool: fractary_forge_agent_list

cli:
  command: fractary-forge
  args: ["agent-list"]
```

## 3. Architecture

### 3.1 Project Structure

```
forge/
├── mcp/
│   └── server/                        # @fractary/forge-mcp
│       ├── src/
│       │   ├── tools/
│       │   │   ├── agent.ts          # Agent query tools (3)
│       │   │   ├── tool.ts           # Tool query tools (3)
│       │   │   ├── plugin.ts         # Plugin query tools (3)
│       │   │   ├── config.ts         # Configuration tools (3)
│       │   │   ├── cache.ts          # Cache management tools (2)
│       │   │   ├── fork.ts           # Fork query tools (4)
│       │   │   └── index.ts          # Tool exports
│       │   ├── server.ts             # MCP server implementation
│       │   ├── types.ts              # Shared type definitions
│       │   └── index.ts              # Main entry point
│       ├── bin/
│       │   └── fractary-forge-mcp.js # Executable entry point
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── cli/                               # Existing CLI (mutations)
├── sdk/js/                            # Existing SDK
└── package.json                       # Monorepo root
```

### 3.2 Naming Convention

Following SPEC-00026 Section 3.9 (Universal Naming Convention):

| Interface | Pattern | Example |
|-----------|---------|---------|
| npm package | `@fractary/{domain}-mcp` | `@fractary/forge-mcp` |
| MCP server name | `fractary-{domain}` | `fractary-forge` |
| MCP tool name | `fractary_{domain}_{category}_{action}` | `fractary_forge_agent_list` |

### 3.3 Package Configuration

```json
{
  "name": "@fractary/forge-mcp",
  "version": "1.0.0",
  "description": "MCP server for Fractary Forge - Universal tool access for AI agent registry",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "fractary-forge-mcp": "bin/fractary-forge-mcp.js"
  },
  "dependencies": {
    "@fractary/forge": "file:../../sdk/js",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

## 4. Tool Definitions

### 4.1 Tool Summary

The MCP server exposes **18 read-focused tools** organized into 6 categories:

| Category | Tool Name | CLI Equivalent | Description |
|----------|-----------|----------------|-------------|
| **Agent** (3) | `fractary_forge_agent_list` | `agent-list` | List available agents |
| | `fractary_forge_agent_info` | `agent-info` | Get agent information |
| | `fractary_forge_agent_validate` | `agent-validate` | Validate agent definition |
| **Tool** (3) | `fractary_forge_tool_list` | `tool-list` | List available tools |
| | `fractary_forge_tool_info` | `tool-info` | Get tool information |
| | `fractary_forge_tool_validate` | `tool-validate` | Validate tool definition |
| **Plugin** (3) | `fractary_forge_plugin_list` | `list` | List installed plugins |
| | `fractary_forge_plugin_info` | `info` | Get plugin information |
| | `fractary_forge_plugin_search` | `search` | Search for plugins |
| **Config** (3) | `fractary_forge_config_get` | `config get` | Get configuration value |
| | `fractary_forge_config_registry_list` | `registry list` | List configured registries |
| | `fractary_forge_config_show` | `config show` | Show full configuration |
| **Cache** (2) | `fractary_forge_cache_stats` | `cache stats` | Get cache statistics |
| | `fractary_forge_cache_clear` | `cache clear` | Clear cache entries |
| **Fork** (4) | `fractary_forge_fork_list` | `fork list` | List forked assets |
| | `fractary_forge_fork_info` | `fork info` | Get fork information |
| | `fractary_forge_fork_diff` | `fork diff` | Show diff from upstream |
| | `fractary_forge_fork_check` | `fork check` | Check for upstream updates |

**Total: 18 tools**

### 4.1.1 CLI-Only Operations (Not in MCP)

These operations require project context or perform mutations:

| Operation | CLI Command | Reason Excluded |
|-----------|-------------|-----------------|
| Install plugin | `install` | Requires project path, modifies filesystem |
| Uninstall plugin | `uninstall` | Requires project path, modifies filesystem |
| Initialize config | `init` | Creates project files |
| Update plugins | `update` | Modifies installed plugins |
| Generate lockfile | `lock` | Requires project context |
| Create fork | `fork create` | Creates files |
| Merge upstream | `merge` | Modifies files |
| Add registry | `registry add` | Modifies config |
| Remove registry | `registry remove` | Modifies config |
| Login | `login` | Stores credentials |
| Logout | `logout` | Removes credentials |
| Create agent | `agent-create` | Creates files |

### 4.2 Agent Tools

#### 4.2.1 fractary_forge_agent_list

List available agents from configured sources.

**Input Schema:**
```typescript
{
  tags?: string[];           // Filter by tags
  source?: 'local' | 'global' | 'stockyard' | 'all';  // Filter by source (default: all)
  limit?: number;            // Max results (default: 100)
  offset?: number;           // Pagination offset (default: 0)
}
```

**Output Schema:**
```typescript
{
  agents: Array<{
    name: string;
    version: string;
    description?: string;
    tags?: string[];
    source: 'local' | 'global' | 'stockyard';
    path: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

#### 4.2.2 fractary_forge_agent_info

Get detailed information about an agent.

**Input Schema:**
```typescript
{
  name: string;              // Agent name (required)
  version?: string;          // Specific version (default: latest)
  source?: 'local' | 'global' | 'stockyard' | 'all';  // Resolution source
}
```

**Output Schema:**
```typescript
{
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  tags?: string[];
  tools?: string[];
  extends?: string;
  prompt?: string;
  source: 'local' | 'global' | 'stockyard';
  path: string;
  dependencies?: Array<{
    name: string;
    version: string;
    type: 'tool' | 'agent';
  }>;
}
```

#### 4.2.3 fractary_forge_agent_validate

Validate an agent definition.

**Input Schema:**
```typescript
{
  path?: string;             // Path to agent file (mutually exclusive with name)
  name?: string;             // Agent name to validate (mutually exclusive with path)
  strict?: boolean;          // Enable strict validation (default: false)
}
```

**Output Schema:**
```typescript
{
  valid: boolean;
  path: string;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
  schema_version: string;
}
```

### 4.3 Tool Tools

#### 4.3.1 fractary_forge_tool_list

List available tools from configured sources.

**Input Schema:**
```typescript
{
  tags?: string[];           // Filter by tags
  source?: 'local' | 'global' | 'stockyard' | 'all';  // Filter by source (default: all)
  limit?: number;            // Max results (default: 100)
  offset?: number;           // Pagination offset (default: 0)
}
```

**Output Schema:**
```typescript
{
  tools: Array<{
    name: string;
    version: string;
    description?: string;
    tags?: string[];
    source: 'local' | 'global' | 'stockyard';
    path: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

#### 4.3.2 fractary_forge_tool_info

Get detailed information about a tool.

**Input Schema:**
```typescript
{
  name: string;              // Tool name (required)
  version?: string;          // Specific version (default: latest)
  source?: 'local' | 'global' | 'stockyard' | 'all';  // Resolution source
}
```

**Output Schema:**
```typescript
{
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  tags?: string[];
  inputSchema?: object;      // JSON Schema for inputs
  outputSchema?: object;     // JSON Schema for outputs
  source: 'local' | 'global' | 'stockyard';
  path: string;
}
```

#### 4.3.3 fractary_forge_tool_validate

Validate a tool definition.

**Input Schema:**
```typescript
{
  path?: string;             // Path to tool file (mutually exclusive with name)
  name?: string;             // Tool name to validate (mutually exclusive with path)
  strict?: boolean;          // Enable strict validation (default: false)
}
```

**Output Schema:**
```typescript
{
  valid: boolean;
  path: string;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
  schema_version: string;
}
```

### 4.4 Plugin Tools

#### 4.4.1 fractary_forge_plugin_list

List installed plugins.

**Input Schema:**
```typescript
{
  scope?: 'global' | 'local' | 'all';  // Filter by scope (default: all)
  outdated?: boolean;        // Show only outdated plugins (default: false)
}
```

**Output Schema:**
```typescript
{
  plugins: Array<{
    name: string;
    version: string;
    scope: 'global' | 'local';
    path: string;
    hasUpdate?: boolean;
    latestVersion?: string;
  }>;
  total: number;
}
```

#### 4.4.2 fractary_forge_plugin_info

Get detailed plugin information.

**Input Schema:**
```typescript
{
  plugin: string;            // Plugin name (required)
  version?: string;          // Specific version
  remote?: boolean;          // Fetch from remote registry (default: false)
}
```

**Output Schema:**
```typescript
{
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  components: {
    agents: string[];
    tools: string[];
    workflows: string[];
    hooks: string[];
    commands: string[];
  };
  dependencies?: Record<string, string>;
  installed?: {
    scope: 'global' | 'local';
    path: string;
    installedVersion: string;
  };
  availableVersions?: string[];
}
```

#### 4.4.3 fractary_forge_plugin_search

Search for plugins in registries.

**Input Schema:**
```typescript
{
  query: string;             // Search query (required)
  tags?: string[];           // Filter by tags
  limit?: number;            // Max results (default: 20)
  offset?: number;           // Pagination offset (default: 0)
}
```

**Output Schema:**
```typescript
{
  results: Array<{
    name: string;
    version: string;
    description?: string;
    author?: string;
    tags?: string[];
    downloads?: number;
    registry: string;
  }>;
  total: number;
  query: string;
}
```

### 4.5 Configuration Tools

#### 4.5.1 fractary_forge_config_get

Get a specific configuration value.

**Input Schema:**
```typescript
{
  key: string;               // Configuration key path (e.g., "registries.0.url")
}
```

**Output Schema:**
```typescript
{
  key: string;
  value: any;
  exists: boolean;
}
```

#### 4.5.2 fractary_forge_config_show

Show the full resolved configuration.

**Input Schema:**
```typescript
{
  includeDefaults?: boolean; // Include default values (default: true)
  format?: 'json' | 'yaml';  // Output format (default: json)
}
```

**Output Schema:**
```typescript
{
  config: {
    registries: Array<{
      name: string;
      url: string;
      priority: number;
    }>;
    cache: {
      directory: string;
      ttl: number;
    };
    resolution: {
      local: boolean;
      global: boolean;
      stockyard: boolean;
    };
  };
  sources: string[];         // Config files that contributed
}
```

#### 4.5.3 fractary_forge_config_registry_list

List configured registries.

**Input Schema:**
```typescript
{
  // No parameters
}
```

**Output Schema:**
```typescript
{
  registries: Array<{
    name: string;
    url: string;
    priority: number;
    authenticated: boolean;
  }>;
}
```

### 4.6 Cache Tools

#### 4.6.1 fractary_forge_cache_clear

Clear cache.

**Input Schema:**
```typescript
{
  type?: 'manifests' | 'downloads' | 'all';  // Cache type (default: all)
  olderThan?: number;        // Clear entries older than N days
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  cleared: {
    manifests: number;
    downloads: number;
    totalSize: string;
  };
}
```

#### 4.6.2 fractary_forge_cache_stats

Get cache statistics.

**Input Schema:**
```typescript
{
  // No parameters
}
```

**Output Schema:**
```typescript
{
  manifests: {
    count: number;
    size: string;
    oldestEntry: string;
    newestEntry: string;
  };
  downloads: {
    count: number;
    size: string;
  };
  totalSize: string;
  location: string;
}
```

### 4.7 Fork Tools

#### 4.7.1 fractary_forge_fork_list

List forked agents and tools.

**Input Schema:**
```typescript
{
  type?: 'agent' | 'tool' | 'all';  // Filter by type (default: all)
}
```

**Output Schema:**
```typescript
{
  forks: Array<{
    name: string;
    type: 'agent' | 'tool';
    upstream: {
      name: string;
      version: string;
    };
    localVersion: string;
    path: string;
    hasUpstreamUpdate: boolean;
  }>;
  total: number;
}
```

#### 4.7.2 fractary_forge_fork_info

Get detailed information about a fork.

**Input Schema:**
```typescript
{
  name: string;              // Forked asset name (required)
}
```

**Output Schema:**
```typescript
{
  name: string;
  type: 'agent' | 'tool';
  path: string;
  upstream: {
    name: string;
    version: string;
    currentVersion: string;  // Latest available upstream version
  };
  localVersion: string;
  createdAt: string;
  lastMerged?: string;
  hasUpstreamUpdate: boolean;
}
```

#### 4.7.3 fractary_forge_fork_diff

Show differences between fork and upstream.

**Input Schema:**
```typescript
{
  name: string;              // Forked asset name (required)
  format?: 'unified' | 'json';  // Output format (default: unified)
}
```

**Output Schema:**
```typescript
{
  name: string;
  upstreamVersion: string;
  localVersion: string;
  differences: Array<{
    field: string;
    local: any;
    upstream: any;
    changeType: 'added' | 'removed' | 'modified';
  }>;
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
}
```

#### 4.7.4 fractary_forge_fork_check

Check if upstream has updates available.

**Input Schema:**
```typescript
{
  name?: string;             // Specific fork to check (default: all forks)
}
```

**Output Schema:**
```typescript
{
  updates: Array<{
    name: string;
    type: 'agent' | 'tool';
    localVersion: string;
    upstreamVersion: string;
    breakingChanges: boolean;
  }>;
  total: number;
  hasUpdates: boolean;
}
```

## 5. Implementation Details

### 5.1 Server Implementation

```typescript
// src/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { agentTools } from './tools/agent.js';
import { toolTools } from './tools/tool.js';
import { pluginTools } from './tools/plugin.js';
import { configTools } from './tools/config.js';
import { cacheTools } from './tools/cache.js';
import { forkTools } from './tools/fork.js';

// Combine all tools (18 read-focused tools)
const allTools = [
  ...agentTools,     // 3: list, info, validate
  ...toolTools,      // 3: list, info, validate
  ...pluginTools,    // 3: list, info, search
  ...configTools,    // 3: get, show, registry_list
  ...cacheTools,     // 2: stats, clear
  ...forkTools,      // 4: list, info, diff, check
];

// Create server
const server = new Server(
  {
    name: 'fractary-forge',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  })),
}));

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = allTools.find(t => t.name === request.params.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  return await tool.handler(request.params.arguments);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### 5.2 Tool Implementation Pattern

```typescript
// src/tools/agent.ts
import { z } from 'zod';
import { Registry, DefinitionResolver } from '@fractary/forge';

// Schema definitions
const agentListInputSchema = z.object({
  tags: z.array(z.string()).optional(),
  source: z.enum(['local', 'global', 'stockyard', 'all']).optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
  offset: z.number().min(0).optional().default(0),
});

// Tool definition
export const fractary_forge_agent_list = {
  name: 'fractary_forge_agent_list',
  description: 'List available agents with optional filtering by tags and source',
  inputSchema: {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags',
      },
      source: {
        type: 'string',
        enum: ['local', 'global', 'stockyard', 'all'],
        description: 'Filter by resolution source',
      },
      limit: {
        type: 'number',
        description: 'Maximum results (default: 100)',
      },
      offset: {
        type: 'number',
        description: 'Pagination offset',
      },
    },
  },

  handler: async (args: unknown) => {
    // Validate input
    const input = agentListInputSchema.parse(args);

    // Create resolver
    const resolver = new DefinitionResolver();

    // List agents
    const agents = await resolver.listAgents({
      tags: input.tags,
      source: input.source,
    });

    // Apply pagination
    const paginated = agents.slice(input.offset, input.offset + input.limit);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          agents: paginated,
          total: agents.length,
          limit: input.limit,
          offset: input.offset,
        }, null, 2),
      }],
    };
  },
};

// Export all agent tools
export const agentTools = [
  fractary_forge_agent_create,
  fractary_forge_agent_info,
  fractary_forge_agent_list,
  fractary_forge_agent_validate,
];
```

### 5.3 Executable Entry Point

```javascript
#!/usr/bin/env node
// bin/fractary-forge-mcp.js

import '../dist/server.js';
```

### 5.4 Configuration Discovery

The MCP server discovers configuration in this order:

1. `FRACTARY_CONFIG` environment variable
2. `.fractary/config.json` in current directory
3. `~/.fractary/config.json` (global)
4. Default configuration

```typescript
// src/config.ts
import { loadConfig } from '@fractary/forge';

export async function getConfig() {
  // Check env var first
  if (process.env.FRACTARY_CONFIG) {
    return loadConfig(process.env.FRACTARY_CONFIG);
  }

  // Use SDK's config discovery
  return loadConfig();
}
```

## 6. Configuration

### 6.1 Claude Code Configuration

Users configure the MCP server in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "fractary-forge": {
      "command": "npx",
      "args": ["-y", "@fractary/forge-mcp"],
      "env": {
        "FRACTARY_CONFIG": ".fractary/config.json"
      }
    }
  }
}
```

### 6.2 Alternative: Direct Node Execution

```json
{
  "mcpServers": {
    "fractary-forge": {
      "command": "node",
      "args": ["/path/to/node_modules/@fractary/forge-mcp/bin/fractary-forge-mcp.js"],
      "env": {
        "FRACTARY_CONFIG": ".fractary/config.json"
      }
    }
  }
}
```

### 6.3 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FRACTARY_CONFIG` | Path to config file | Auto-discover |
| `FRACTARY_CACHE_DIR` | Cache directory | `~/.fractary/cache` |
| `FRACTARY_LOG_LEVEL` | Logging level | `info` |
| `FRACTARY_REGISTRY_TOKEN` | Default registry auth token | None |

## 7. Error Handling

### 7.1 Error Response Format

All tools return errors in a consistent format:

```typescript
{
  content: [{
    type: 'text',
    text: JSON.stringify({
      error: true,
      code: 'PLUGIN_NOT_FOUND',
      message: 'Plugin @fractary/unknown not found in any registry',
      details: {
        plugin: '@fractary/unknown',
        searchedRegistries: ['fractary-official', 'local'],
      },
      suggestions: [
        'Check plugin name spelling',
        'Run: fractary_forge_registry_search to find plugins',
        'Verify registry is configured: fractary_forge_config_registry_list',
      ],
    }, null, 2),
  }],
  isError: true,
}
```

### 7.2 Error Codes

| Code | Description |
|------|-------------|
| `PLUGIN_NOT_FOUND` | Plugin not found in registries |
| `AGENT_NOT_FOUND` | Agent definition not found |
| `TOOL_NOT_FOUND` | Tool definition not found |
| `VALIDATION_ERROR` | Input validation failed |
| `PERMISSION_DENIED` | Insufficient permissions |
| `NETWORK_ERROR` | Network/connectivity issue |
| `AUTH_REQUIRED` | Authentication required |
| `AUTH_FAILED` | Authentication failed |
| `CONFIG_ERROR` | Configuration error |
| `INTEGRITY_ERROR` | Checksum verification failed |
| `DEPENDENCY_ERROR` | Dependency resolution failed |
| `CONFLICT_ERROR` | Merge conflict detected |

## 8. Testing Strategy

### 8.1 Unit Tests

Each tool module has corresponding tests:

```
src/tools/__tests__/
├── agent.test.ts      # agent list, info, validate
├── tool.test.ts       # tool list, info, validate
├── plugin.test.ts     # plugin list, info, search
├── config.test.ts     # config get, show, registry_list
├── cache.test.ts      # cache stats, clear
└── fork.test.ts       # fork list, info, diff, check
```

### 8.2 Integration Tests

Test MCP server as a whole:

```typescript
// __tests__/server.integration.test.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Forge MCP Server', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('lists all tools', async () => {
    const tools = await client.listTools();
    expect(tools.length).toBe(18);  // 18 read-focused tools
  });

  it('executes agent-list tool', async () => {
    const result = await client.callTool('fractary_forge_agent_list', {});
    expect(result.content[0].type).toBe('text');
    const data = JSON.parse(result.content[0].text);
    expect(data.agents).toBeDefined();
    expect(data.total).toBeGreaterThanOrEqual(0);
  });

  it('executes plugin-search tool', async () => {
    const result = await client.callTool('fractary_forge_plugin_search', {
      query: 'faber',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.results).toBeDefined();
    expect(data.query).toBe('faber');
  });
});
```

### 8.3 E2E Tests

Test with actual MCP clients using stdio transport:

```bash
# Start server and send test request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx @fractary/forge-mcp
```

## 9. Migration & Compatibility

### 9.1 SDK Dependency

The MCP server depends on `@fractary/forge` SDK. Keeping versions aligned ensures compatibility:

```json
{
  "dependencies": {
    "@fractary/forge": "^1.1.0"
  },
  "peerDependencies": {
    "@fractary/forge": ">=1.0.0 <2.0.0"
  }
}
```

### 9.2 Breaking Changes Policy

- Major version bump required for tool schema changes
- Tool additions are minor version bumps
- Bug fixes are patch versions

## 10. Future Considerations

### 10.1 Streaming Support

For long-running operations (large plugin installs), implement streaming:

```typescript
// Future: Streaming progress
handler: async function* (args) {
  yield { type: 'progress', message: 'Downloading plugin...' };
  yield { type: 'progress', message: 'Installing agents...' };
  yield { type: 'result', data: result };
}
```

### 10.2 Resource Support

MCP resources could expose:
- Installed agent definitions
- Plugin manifests
- Cache contents

### 10.3 Prompt Support

MCP prompts could provide:
- Interactive plugin search
- Guided configuration setup
- Conflict resolution wizard

## 11. Implementation Phases

### Phase 1: Core Infrastructure
1. Create project structure under `/mcp/server/`
2. Set up TypeScript configuration
3. Implement server skeleton with MCP SDK
4. Add basic tool registration framework

### Phase 2: Core Query Tools (9 tools)
1. Implement agent tools (3): list, info, validate
2. Implement tool tools (3): list, info, validate
3. Implement plugin tools (3): list, info, search
4. Add input validation with Zod

### Phase 3: Supporting Tools (9 tools)
1. Implement config tools (3): get, show, registry_list
2. Implement cache tools (2): stats, clear
3. Implement fork tools (4): list, info, diff, check

### Phase 4: Polish & Release
1. Add comprehensive error handling
2. Write documentation (README)
3. Add unit and integration tests
4. Add to workspace and publish to npm

## 12. Success Metrics

| Metric | Target |
|--------|--------|
| Tool coverage | 100% (18/18 read-focused tools) |
| Test coverage | >80% |
| Response time (avg) | <200ms |
| Memory usage | <100MB |
| npm weekly downloads | >100 (first month) |

## Appendix A: Tool Reference Quick Index

```
Agent Tools (3):
  fractary_forge_agent_list       - List available agents
  fractary_forge_agent_info       - Get agent details
  fractary_forge_agent_validate   - Validate agent definition

Tool Tools (3):
  fractary_forge_tool_list        - List available tools
  fractary_forge_tool_info        - Get tool details
  fractary_forge_tool_validate    - Validate tool definition

Plugin Tools (3):
  fractary_forge_plugin_list      - List installed plugins
  fractary_forge_plugin_info      - Get plugin details
  fractary_forge_plugin_search    - Search registry for plugins

Config Tools (3):
  fractary_forge_config_get           - Get config value
  fractary_forge_config_show          - Show full config
  fractary_forge_config_registry_list - List registries

Cache Tools (2):
  fractary_forge_cache_stats  - Cache statistics
  fractary_forge_cache_clear  - Clear cache entries

Fork Tools (4):
  fractary_forge_fork_list    - List forked assets
  fractary_forge_fork_info    - Get fork details
  fractary_forge_fork_diff    - Show diff from upstream
  fractary_forge_fork_check   - Check for upstream updates

Total: 18 tools
```

### CLI-Only Operations (Not in MCP)

```
Mutations (require project context):
  fractary-forge install        - Install plugin
  fractary-forge uninstall      - Uninstall plugin
  fractary-forge update         - Update plugins
  fractary-forge init           - Initialize config
  fractary-forge lock           - Generate lockfile
  fractary-forge agent-create   - Create agent
  fractary-forge fork create    - Fork asset
  fractary-forge merge          - Merge upstream
  fractary-forge registry add   - Add registry
  fractary-forge registry remove - Remove registry

Authentication (handled via CLI/env):
  fractary-forge login          - Login to registry
  fractary-forge logout         - Logout from registry
```

## Appendix B: Example MCP Interactions

### List Tools Request
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### List Tools Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "fractary_forge_agent_list",
        "description": "List available agents with optional filtering",
        "inputSchema": {
          "type": "object",
          "properties": {
            "tags": { "type": "array", "items": { "type": "string" } },
            "source": { "type": "string", "enum": ["local", "global", "stockyard", "all"] }
          }
        }
      }
      // ... 17 more tools
    ]
  }
}
```

### Call Tool Request (Query Example)
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "fractary_forge_plugin_search",
    "arguments": {
      "query": "faber",
      "limit": 10
    }
  }
}
```

### Call Tool Response
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"results\":[{\"name\":\"@fractary/faber-plugin\",\"version\":\"1.0.0\",\"description\":\"FABER workflow orchestration plugin\",\"author\":\"Fractary\",\"tags\":[\"workflow\",\"faber\"],\"registry\":\"stockyard\"}],\"total\":1,\"query\":\"faber\"}"
    }]
  }
}
```

### Call Tool Request (Validate Example)
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "fractary_forge_agent_validate",
    "arguments": {
      "name": "my-custom-agent",
      "strict": true
    }
  }
}
```

### Call Tool Response (Validation)
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"valid\":true,\"path\":\".fractary/agents/my-custom-agent.yaml\",\"errors\":[],\"warnings\":[{\"field\":\"description\",\"message\":\"Consider adding a description\"}],\"schema_version\":\"1.0\"}"
    }]
  }
}
```
