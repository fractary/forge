# Fractary Forge Architecture

Comprehensive architecture documentation for Fractary Forge.

## Table of Contents

- [Overview](#overview)
- [System Design](#system-design)
- [Core Components](#core-components)
- [Resolution Flow](#resolution-flow)
- [Plugin System](#plugin-system)
- [Cache Architecture](#cache-architecture)
- [Export System](#export-system)
- [Security Model](#security-model)
- [Performance Considerations](#performance-considerations)

## Overview

Fractary Forge is a monorepo containing three main packages:

1. **SDK** (`@fractary/forge`) - Core TypeScript SDK for asset management
2. **CLI** (`@fractary/forge-cli`) - Command-line interface
3. **MCP Server** (`@fractary/forge-mcp`) - Model Context Protocol server

### Design Principles

- **Modularity**: Components are loosely coupled and independently testable
- **Extensibility**: Plugin-based architecture allows custom resolvers
- **Performance**: Multi-tier caching minimizes network requests
- **Security**: Checksum verification and authentication support
- **Developer Experience**: TypeScript-first with comprehensive type safety

## System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐      │
│  │   CLI    │  │   SDK    │  │    MCP Server        │      │
│  └──────────┘  └──────────┘  └──────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Core SDK Layer                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ForgeClient (Entry Point)                │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                               │
│      ┌───────────────────────┼───────────────────────┐      │
│      ▼                       ▼                       ▼      │
│  ┌────────┐          ┌─────────────┐         ┌────────┐   │
│  │ Agents │          │   Plugins   │         │ Tools  │   │
│  │  API   │          │     API     │         │  API   │   │
│  └────────┘          └─────────────┘         └────────┘   │
│      │                       │                       │      │
│      └───────────────────────┼───────────────────────┘      │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Resolution Manager                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │  Local   │  │  Global  │  │     Remote       │  │  │
│  │  │ Resolver │  │ Resolver │  │    Resolver      │  │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Cache   │  │ Config Mgr   │  │   File System    │    │
│  │  Manager  │  │              │  │                  │    │
│  └───────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
│  ┌────────────┐  ┌────────────┐  ┌───────────────────┐    │
│  │   Local    │  │   Global   │  │      Remote       │    │
│  │  Storage   │  │  Storage   │  │    Registries     │    │
│  │ .fractary/ │  │ ~/.fractary│  │  (GitHub, etc.)   │    │
│  └────────────┘  └────────────┘  └───────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. ForgeClient

Central orchestrator that coordinates all operations.

**Responsibilities:**
- Initialize and configure resolvers
- Manage API surfaces (agents, tools, plugins)
- Handle lifecycle management
- Coordinate cache operations

**Key Methods:**
```typescript
class ForgeClient {
  // API surfaces
  readonly agents: AgentsAPI;
  readonly tools: ToolsAPI;
  readonly plugins: PluginsAPI;
  readonly cache: CacheAPI;

  // Core operations
  async resolve(name: string, type: AssetType): Promise<ResolvedAsset>;
  async init(config: ForgeConfig): Promise<void>;
  async destroy(): Promise<void>;
}
```

### 2. Resolution Manager

Implements the three-tier resolution strategy.

```
Resolution Flow:
┌─────────────────────────────────────────────┐
│  1. Local Resolution                        │
│     - Search .fractary/ directory           │
│     - Parse markdown frontmatter            │
│     - Validate schema                       │
└─────────────────────────────────────────────┘
                  ↓ (not found)
┌─────────────────────────────────────────────┐
│  2. Global Resolution                       │
│     - Search ~/.fractary/registry/          │
│     - Check global installations            │
└─────────────────────────────────────────────┘
                  ↓ (not found)
┌─────────────────────────────────────────────┐
│  3. Remote Resolution                       │
│     - Query configured registries           │
│     - Check cache (TTL-based)               │
│     - Fetch registry manifest               │
│     - Download and verify                   │
└─────────────────────────────────────────────┘
```

**Implementation:**

```typescript
class ResolutionManager {
  private resolvers: Resolver[];

  async resolve(
    name: string,
    type: AssetType,
    version?: string
  ): Promise<ResolvedAsset | null> {
    // Try each resolver in order
    for (const resolver of this.resolvers) {
      const result = await resolver.resolve(name, type, version);
      if (result) {
        return result;
      }
    }
    return null;
  }
}
```

### 3. Local Resolver

Resolves assets from the local filesystem.

**Strategy:**
1. Search configured paths
2. Match filename to asset name
3. Parse markdown frontmatter
4. Validate against schema
5. Return resolved asset

**File Structure:**
```
.fractary/
├── agents/
│   ├── my-agent.md
│   └── another-agent.md
├── tools/
│   ├── web-search.md
│   └── file-reader.md
└── workflows/
    └── my-workflow.md
```

### 4. Global Resolver

Resolves from user-wide installation directory.

**Strategy:**
1. Search ~/.fractary/registry/
2. Organized by plugin
3. Same structure as local

**Directory Structure:**
```
~/.fractary/
├── registry/
│   ├── plugins/
│   │   ├── @fractary/
│   │   │   └── faber-plugin/
│   │   │       ├── agents/
│   │   │       ├── tools/
│   │   │       └── plugin.json
│   │   └── @myorg/
│   │       └── custom-plugin/
│   └── cache/
└── config.json
```

### 5. Remote Resolver

Resolves from remote registries.

**Strategy:**
1. Load configured registries (by priority)
2. Check cache for registry manifest
3. If stale/missing, fetch from URL
4. Parse manifest to find plugin
5. Fetch plugin manifest
6. Download components
7. Verify checksums
8. Cache results

**Registry Manifest Structure:**

```json
{
  "version": "1.0.0",
  "registry": {
    "name": "fractary-core",
    "url": "https://raw.githubusercontent.com/fractary/plugins/main/"
  },
  "plugins": [
    {
      "name": "@fractary/faber-plugin",
      "version": "1.0.0",
      "manifest": "https://raw.githubusercontent.com/fractary/plugins/main/faber-plugin/plugin.json",
      "checksum": "sha256-abc123..."
    }
  ]
}
```

### 6. Definition Parser

Parses markdown frontmatter and validates schemas.

**Process:**
1. Read file content
2. Extract YAML frontmatter
3. Parse YAML to JSON
4. Validate against Zod schema
5. Extract markdown body
6. Return structured definition

**Example:**

```typescript
class DefinitionParser {
  parse(content: string, type: AssetType): Definition {
    const { frontmatter, body } = this.extractFrontmatter(content);
    const data = YAML.parse(frontmatter);

    // Validate against schema
    const schema = this.getSchema(type);
    const validated = schema.parse(data);

    return {
      ...validated,
      content: body
    };
  }
}
```

## Resolution Flow

### Detailed Resolution Sequence

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Client Request                                            │
│    client.agents.get('my-agent')                             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Normalize Name                                            │
│    - Parse version constraint                                │
│    - Validate name format                                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Local Resolution                                          │
│    ├─ Search .fractary/agents/my-agent.md                   │
│    ├─ If found: Parse and return                            │
│    └─ If not found: Continue                                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Global Resolution                                         │
│    ├─ Search ~/.fractary/registry/**/my-agent.md            │
│    ├─ If found: Parse and return                            │
│    └─ If not found: Continue                                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Remote Resolution                                         │
│    ├─ For each registry (by priority):                      │
│    │  ├─ Check cache for registry manifest                  │
│    │  ├─ If stale: Fetch fresh manifest                     │
│    │  ├─ Search manifest for 'my-agent'                     │
│    │  ├─ If found:                                           │
│    │  │  ├─ Fetch plugin manifest                           │
│    │  │  ├─ Download component                              │
│    │  │  ├─ Verify checksum                                 │
│    │  │  ├─ Cache result                                    │
│    │  │  └─ Return                                           │
│    │  └─ If not found: Try next registry                    │
│    └─ If all registries searched: Not found                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Post-Processing                                           │
│    ├─ Resolve dependencies (if requested)                   │
│    ├─ Apply inheritance (extends field)                     │
│    ├─ Validate final definition                             │
│    └─ Return to client                                       │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Resolution

When resolving dependencies (e.g., agent's tools):

```
┌─────────────────────────────────────────────┐
│ Resolve Agent 'my-agent'                    │
│ ├─ tools: ['web-search', 'file-reader']    │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Build Dependency Graph                      │
│ ├─ my-agent@1.0.0                           │
│ │  ├─ web-search@2.0.0                      │
│ │  │  └─ http-client@1.5.0                  │
│ │  └─ file-reader@1.0.0                     │
│ │     └─ fs-utils@3.0.0                     │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Resolve Each Dependency                     │
│ ├─ Parallel resolution                      │
│ ├─ Cycle detection                          │
│ └─ Version conflict resolution              │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Return Resolved Tree                        │
└─────────────────────────────────────────────┘
```

## Plugin System

### Plugin Structure

```
my-plugin/
├── plugin.json              # Plugin manifest
├── agents/
│   ├── agent-1.md
│   └── agent-2.md
├── tools/
│   ├── tool-1.md
│   └── tool-2.md
├── workflows/
│   └── workflow-1.md
├── templates/
│   └── template-1/
├── hooks/
│   └── pre-commit.sh
├── commands/
│   └── custom-command.js
└── README.md
```

### Plugin Manifest

```json
{
  "name": "@myorg/my-plugin",
  "version": "1.0.0",
  "description": "My custom plugin",
  "author": "Author Name",
  "license": "MIT",
  "repository": "https://github.com/myorg/my-plugin",
  "components": {
    "agents": [
      { "name": "agent-1", "file": "agents/agent-1.md", "version": "1.0.0" }
    ],
    "tools": [
      { "name": "tool-1", "file": "tools/tool-1.md", "version": "1.0.0" }
    ],
    "workflows": [
      { "name": "workflow-1", "file": "workflows/workflow-1.md", "version": "1.0.0" }
    ]
  },
  "dependencies": {
    "@fractary/faber-plugin": "^1.0.0"
  },
  "checksum": "sha256-abc123..."
}
```

### Plugin Installation Flow

```
┌─────────────────────────────────────────────┐
│ 1. User Request                             │
│    fractary-forge install @myorg/my-plugin  │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 2. Resolve Plugin                           │
│    - Search registries                      │
│    - Find plugin manifest                   │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 3. Validate Plugin                          │
│    - Check version compatibility            │
│    - Verify checksums                       │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 4. Resolve Dependencies                     │
│    - Build dependency tree                  │
│    - Check for conflicts                    │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 5. Download Components                      │
│    - Fetch each component file              │
│    - Verify individual checksums            │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 6. Install                                   │
│    - Copy to target directory               │
│    - Update local index                     │
│    - Run post-install hooks                 │
└─────────────────────────────────────────────┘
```

## Cache Architecture

### Cache Layers

```
┌─────────────────────────────────────────────┐
│ Memory Cache (In-Process)                   │
│ - Hot data (recently accessed)              │
│ - TTL: 5 minutes                            │
│ - Size limit: 50MB                          │
└─────────────────────────────────────────────┘
                  ↓ (miss)
┌─────────────────────────────────────────────┐
│ Disk Cache (Local Filesystem)               │
│ - Registry manifests                        │
│ - Plugin manifests                          │
│ - Downloaded components                     │
│ - TTL: 1 hour (configurable)                │
│ - Location: ~/.fractary/cache/              │
└─────────────────────────────────────────────┘
                  ↓ (miss)
┌─────────────────────────────────────────────┐
│ Remote Fetch (Network)                      │
│ - Fetch from registry URL                   │
│ - Store in disk cache                       │
│ - Populate memory cache                     │
└─────────────────────────────────────────────┘
```

### Cache Key Structure

```
cache/
├── registries/
│   ├── fractary-core.json
│   └── my-company.json
├── plugins/
│   ├── @fractary/
│   │   └── faber-plugin/
│   │       ├── plugin.json
│   │       └── components/
│   │           ├── agents/
│   │           └── tools/
└── metadata/
    └── cache-index.json
```

### Cache Invalidation

```typescript
interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  checksum?: string;
}

class CacheManager {
  async get(key: string): Promise<any> {
    const entry = await this.load(key);

    if (!entry) return null;

    // Check if stale
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      await this.invalidate(key);
      return null;
    }

    // Verify checksum if available
    if (entry.checksum) {
      const computed = await this.computeChecksum(entry.data);
      if (computed !== entry.checksum) {
        await this.invalidate(key);
        return null;
      }
    }

    return entry.data;
  }
}
```

## Export System

### Exporter Architecture

```
┌─────────────────────────────────────────────┐
│            ExportManager                     │
│  ┌───────────────────────────────────────┐ │
│  │  Input: Resolved Assets               │ │
│  └───────────────────────────────────────┘ │
│                    ↓                         │
│  ┌───────────────────────────────────────┐ │
│  │  Format Selection                     │ │
│  │  - LangChain                          │ │
│  │  - Claude Code                        │ │
│  │  - n8n                                │ │
│  └───────────────────────────────────────┘ │
│                    ↓                         │
│  ┌───────────────────────────────────────┐ │
│  │  Format-Specific Exporter             │ │
│  │  - Transform data structure           │ │
│  │  - Generate code/config               │ │
│  │  - Create supporting files            │ │
│  └───────────────────────────────────────┘ │
│                    ↓                         │
│  ┌───────────────────────────────────────┐ │
│  │  Output: Framework-specific files     │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### LangChain Exporter

Transforms agent definitions into Python LangChain code:

```python
# Generated by Forge LangChain Exporter
from langchain.agents import AgentExecutor
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(
    model="claude-3-5-sonnet-20241022",
    temperature=0.7
)

# ... generated code
```

## Security Model

### Checksum Verification

All downloaded components are verified:

```typescript
class SecurityManager {
  async verifyChecksum(
    content: string,
    expectedChecksum: string
  ): Promise<boolean> {
    const computed = createHash('sha256')
      .update(content)
      .digest('hex');

    return `sha256-${computed}` === expectedChecksum;
  }
}
```

### Authentication

```typescript
interface AuthConfig {
  type: 'token' | 'oauth' | 'basic';
  credentials: {
    token?: string;
    username?: string;
    password?: string;
  };
}

class RegistryAuthenticator {
  async authenticate(registry: RegistryConfig): Promise<void> {
    if (registry.auth) {
      // Add auth headers to requests
      this.headers['Authorization'] = `Bearer ${registry.auth.token}`;
    }
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Parallel Resolution**: Resolve dependencies in parallel
2. **Lazy Loading**: Load components only when needed
3. **Incremental Updates**: Only fetch changed components
4. **Smart Caching**: Multi-tier cache with TTL
5. **Batch Operations**: Batch multiple operations together

### Performance Metrics

```typescript
interface PerformanceMetrics {
  resolutionTime: number;
  cacheHitRate: number;
  networkRequests: number;
  bytesDownloaded: number;
}
```

## Next Steps

- Review [API Reference](./API.md)
- Read [Developer Guide](./DEVELOPER.md)
- Explore [Examples](./examples/basic-usage.md)
