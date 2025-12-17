# @fractary/forge

> **Core SDK for Agent & Tool Registry, Resolution, and Plugin Distribution**

`@fractary/forge` is a comprehensive TypeScript SDK for managing, resolving, and distributing AI agents, tools, workflows, and templates. It provides both a **Definition System** for lockfile-based dependency management and a **Registry System** for manifest-based plugin installation across local, global, and remote registries.

[![npm version](https://img.shields.io/npm/v/@fractary/forge)](https://www.npmjs.com/package/@fractary/forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Definition System](#definition-system-quick-start)
  - [Registry System](#registry-system-quick-start)
  - [Exporters](#exporters-quick-start)
- [Core Concepts](#core-concepts)
- [Registry Module](#registry-module)
- [Exporters Module](#exporters-module)
- [Documentation](#documentation)
- [Architecture](#architecture)
- [Use Cases](#use-cases)
- [Development](#development)
- [License](#license)

---

## ✨ Features

### Definition System (Lockfile-Based)
- **3-Tier Resolution**: Local → Global → Stockyard (remote marketplace)
- **Version Management**: Semver-based version constraints and resolution
- **Dependency Resolution**: Automatic dependency tree building with cycle detection
- **Inheritance System**: Agent/tool definition inheritance with `extends` keyword
- **Lockfile Generation**: Pin exact versions with SHA-256 integrity hashing
- **Fork Workflows**: Fork agents/tools for customization with upstream merging
- **Update Detection**: Automatic detection of available updates with breaking change warnings

### Registry System (Plugin-Based)
- **Plugin Installation**: Install plugins from manifest-based registries
- **3-Tier Resolution**: Local (.fractary/) → Global (~/.fractary/registry/) → Remote registries
- **Manifest Caching**: TTL-based caching to reduce network requests
- **Checksum Verification**: SHA-256 verification for all downloads
- **Multi-Component Support**: Agents, tools, workflows, templates, hooks, commands
- **Scope Management**: Global and local installation with proper isolation
- **Configuration System**: Project and global configuration with priority merging

### Exporters (Framework Integration)
- **LangChain Export**: Convert to Python code with LangChain/LangGraph
- **Claude Code Export**: Convert to markdown for .claude/ directory
- **n8n Export**: Convert to n8n workflow JSON
- **Flexible Options**: Format-specific export configuration
- **Batch Export**: Export entire plugins or individual components

### Developer Experience
- **TypeScript-First**: Full TypeScript support with comprehensive type definitions
- **Schema Validation**: Zod-based schema validation for all manifests and definitions
- **Error Handling**: Detailed error messages with context and suggestions
- **Extensible**: Plugin-based architecture for custom resolvers and handlers
- **SDK-Focused**: Clean programmatic API designed for CLI and tool integration

---

## 🆕 What's New in v1.2.0

### Breaking Changes: Naming Convention Update

Version 1.2.0 introduces consistent `{noun}-{action}` naming across all systems:

- **JavaScript SDK**: All methods renamed to `{noun}{Action}` camelCase (e.g., `agentResolve()`, `toolExecute()`)
- **Python SDK**: New! Full feature parity with `{noun}_{action}` snake_case (e.g., `agent_resolve()`, `tool_execute()`)
- **CLI**: Already compliant with `{noun}-{action}` kebab-case (e.g., `agent-info`, `tool-list`)
- **MCP Server**: Already compliant with `fractary_forge_{noun}_{action}` (e.g., `fractary_forge_agent_info`)

**Migration**: See [MIGRATION-GUIDE-v1.2.0.md](./MIGRATION-GUIDE-v1.2.0.md) for detailed migration instructions and automated migration scripts.

**Naming Conventions**: See [docs/NAMING-CONVENTIONS.md](./docs/NAMING-CONVENTIONS.md) for the complete naming convention reference.

### New Python SDK

The Python SDK is now available with 100% feature parity to the JavaScript SDK:

```python
from fractary_forge import AgentRegistry, ToolRegistry

# Three-tier resolution
registry = AgentRegistry()
agent = registry.agent_resolve('my-agent')

# Tool execution
tool_registry = ToolRegistry()
result = tool_registry.tool_execute('my-tool', {'param': 'value'})
```

See [sdk/python/README.md](./sdk/python/README.md) for full Python SDK documentation.

---

## 📦 Installation

```bash
npm install @fractary/forge
```

**Requirements:**
- Node.js >= 18.0.0
- TypeScript >= 5.3 (for TypeScript projects)

---

## 🚀 Quick Start

### Definition System Quick Start

#### 1. Initialize Forge Configuration

```typescript
import { DefinitionResolver, LockfileManager } from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

// Create resolver with default configuration
const resolver = new DefinitionResolver({
  local: {
    enabled: true,
    paths: [
      path.join(process.cwd(), '.fractary/agents'),
      path.join(process.cwd(), '.fractary/tools'),
    ],
  },
  global: {
    enabled: true,
    path: path.join(os.homedir(), '.fractary/registry'),
  },
  stockyard: {
    enabled: false, // Enable when Stockyard is available
  },
});
```

### 2. Resolve an Agent

```typescript
// Resolve an agent by name and version
const resolved = await resolver.resolveAgent('my-agent@^1.0.0');

console.log(`Name: ${resolved.definition.name}`);
console.log(`Version: ${resolved.version}`);
console.log(`Source: ${resolved.source}`); // 'local', 'global', or 'stockyard'
console.log(`Path: ${resolved.path}`);
console.log(`Tools: ${resolved.definition.tools?.join(', ')}`);
```

### 3. Generate a Lockfile

```typescript
import { LockfileManager } from '@fractary/forge';

const lockfileManager = new LockfileManager(resolver);

// Generate lockfile with all dependencies
const lockfile = await lockfileManager.generate();

console.log(`Locked ${Object.keys(lockfile.agents).length} agents`);
console.log(`Locked ${Object.keys(lockfile.tools).length} tools`);
```

### 4. Check for Updates

```typescript
import { UpdateChecker, ManifestManager } from '@fractary/forge';

const manifestManager = new ManifestManager();
const updateChecker = new UpdateChecker(lockfileManager, manifestManager);

// Check for available updates
const updates = await updateChecker.checkUpdates();

if (updates.hasUpdates) {
  console.log(updateChecker.formatUpdateSummary(updates));

  if (updates.breakingChanges.length > 0) {
    console.log('⚠️  Breaking changes detected!');
  }
}
```

### 5. Fork and Customize

```typescript
import { ForkManager } from '@fractary/forge';

const forkManager = new ForkManager(resolver, manifestManager);

// Fork an agent for customization
await forkManager.forkAgent({
  sourceName: 'base-agent',
  targetName: 'my-custom-agent',
  customizations: {
    description: 'My customized version of base-agent',
    prompt: 'Custom system prompt here...',
  },
});

// Check for upstream updates
const upstreamCheck = await forkManager.checkAgentUpstreamUpdates('my-custom-agent');

if (upstreamCheck.hasUpdate) {
  // Merge upstream changes
  const mergeResult = await forkManager.mergeUpstreamAgent('my-custom-agent', {
    strategy: 'auto', // or 'local', 'upstream', 'manual'
  });

  if (!mergeResult.success) {
    console.log(`${mergeResult.conflicts.length} conflicts need resolution`);
  }
}
```

### Registry System Quick Start

The Registry module provides manifest-based plugin installation. It's designed as an SDK for CLI tools (like `fractary/cli`) to consume.

#### 1. Install a Plugin

```typescript
import { Registry } from '@fractary/forge';

// Install a plugin from remote registry
const result = await Registry.installer.installPlugin('@fractary/faber-plugin', {
  scope: 'global', // or 'local'
  force: false,
});

console.log(`Installed ${result.plugin.name}@${result.plugin.version}`);
console.log(`  Agents: ${result.installed.agents}`);
console.log(`  Tools: ${result.installed.tools}`);
console.log(`  Workflows: ${result.installed.workflows}`);
```

#### 2. Resolve a Component

```typescript
import { Registry } from '@fractary/forge';

// Resolve an agent (checks local → global → remote)
const resolved = await Registry.resolver.resolve('faber-agent', 'agent');

if (resolved) {
  console.log(`Found: ${resolved.name}@${resolved.version}`);
  console.log(`Source: ${resolved.source}`); // 'local', 'global', or 'remote'
  console.log(`Path: ${resolved.path}`);
}
```

#### 3. Manage Registries

```typescript
import { Registry } from '@fractary/forge';

// Add a custom registry
await Registry.configManager.addRegistry({
  name: 'my-registry',
  type: 'manifest',
  url: 'https://example.com/registry.json',
  enabled: true,
  priority: 2,
});

// List all registries
const config = await Registry.configManager.loadConfig();
console.log('Configured registries:', config.registries);
```

#### 4. Cache Management

```typescript
import { Registry } from '@fractary/forge';

// Get cache statistics
const stats = await Registry.manifestCache.getStats();
console.log(`Cache entries: ${stats.totalEntries}`);
console.log(`Fresh: ${stats.freshEntries}, Stale: ${stats.staleEntries}`);

// Clear expired cache entries
await Registry.manifestCache.cleanup();
```

For complete SDK documentation, see [src/registry/README.md](./src/registry/README.md).

### Exporters Quick Start

The Exporters module converts Fractary YAML to various framework-specific formats.

#### 1. Export to LangChain (Python)

```typescript
import { Exporters } from '@fractary/forge';

// Export agents/tools to Python LangChain code
const result = await Exporters.exporter.export(
  {
    agents: [myAgent],
    tools: [myTool],
  },
  {
    format: 'langchain',
    outputDir: './langchain-export',
    formatOptions: {
      pythonVersion: '3.11',
      includeTypeHints: true,
      useAsync: true,
    },
  }
);

console.log(`Exported ${result.summary.totalFiles} files`);
```

#### 2. Export to Claude Code

```typescript
import { Exporters } from '@fractary/forge';

// Export to .claude/ directory structure
const result = await Exporters.exporter.export(
  { agents: [myAgent], tools: [myTool] },
  {
    format: 'claude',
    outputDir: './claude-export',
    formatOptions: {
      includeDirectoryStructure: true,
      asMCPTools: true,
    },
  }
);
```

#### 3. Export to n8n Workflows

```typescript
import { Exporters } from '@fractary/forge';

// Export as n8n workflow JSON
const result = await Exporters.exporter.export(
  { agents: [myAgent] },
  {
    format: 'n8n',
    outputDir: './n8n-export',
    formatOptions: {
      workflowName: 'My Agent Workflow',
    },
  }
);
```

For complete SDK documentation, see [src/exporters/README.md](./src/exporters/README.md).

---

## 🧠 Core Concepts

### Agent Definitions

Agents are AI assistants with specific capabilities, tools, and prompts:

```yaml
# .fractary/agents/my-agent.yaml
name: my-agent
version: 1.0.0
description: A helpful AI assistant
type: agent

model:
  provider: anthropic
  name: claude-sonnet-4

tools:
  - web-search
  - file-reader

prompt: |
  You are a helpful assistant that can search the web
  and read files to help users with their tasks.

config:
  temperature: 0.7
  max_tokens: 4096
```

### Tool Definitions

Tools are executable functions that agents can use:

```yaml
# .fractary/tools/web-search.yaml
name: web-search
version: 1.0.0
description: Search the web for information
type: tool

parameters:
  type: object
  properties:
    query:
      type: string
      description: Search query
  required:
    - query

implementation:
  type: function
  handler: ./handlers/web-search.js
```

### Inheritance

Agents and tools can extend base definitions:

```yaml
# .fractary/agents/specialized-agent.yaml
name: specialized-agent
version: 1.0.0
extends: my-agent  # Inherits from my-agent

# Override specific fields
prompt: |
  You are a specialized version with additional capabilities.

# Add more tools
tools:
  - web-search
  - file-reader
  - code-analyzer  # Additional tool
```

### Dependency Resolution

The SDK automatically resolves all dependencies:

```typescript
import { DependencyResolver } from '@fractary/forge';

const depResolver = new DependencyResolver(resolver);

// Build complete dependency tree
const tree = await depResolver.buildDependencyTree('my-agent', 'agent');

console.log(`Total dependencies: ${tree.nodes.size}`);
for (const [name, node] of tree.nodes) {
  console.log(`  ${name}@${node.version} (${node.type})`);
}
```

### Lockfile Structure

Lockfiles pin exact versions with integrity hashes:

```json
{
  "version": 1,
  "generated": "2025-12-14T12:00:00Z",
  "agents": {
    "my-agent": {
      "version": "1.0.0",
      "resolved": "global",
      "integrity": "sha256-abc123...",
      "dependencies": {
        "tools": {
          "web-search": "1.5.0",
          "file-reader": "2.0.0"
        }
      }
    }
  },
  "tools": {
    "web-search": {
      "version": "1.5.0",
      "resolved": "stockyard",
      "integrity": "sha256-def456..."
    }
  }
}
```

---

## 📦 Registry Module

The Registry module (`src/registry/`) provides a complete plugin installation and management system following a manifest-based architecture. It's designed as an SDK for CLI tools to consume.

### Key Features

- **Manifest-Based Distribution**: Registry manifests list available plugins and their metadata
- **Plugin Manifests**: Each plugin has its own manifest describing contained components
- **Three-Tier Resolution**: Local project (.fractary/) → Global user (~/.fractary/registry/) → Remote registries
- **TTL Caching**: Configurable cache with automatic freshness checks
- **Integrity Verification**: SHA-256 checksums for all downloaded files
- **Flexible Installation**: Install entire plugins or filter by component type
- **Scope Support**: Install globally (shared across projects) or locally (project-specific)

### Component Types

The Registry system supports these component types:

- **Agents**: AI agents with specific capabilities and prompts
- **Tools**: Executable functions that agents can use
- **Workflows**: Multi-step FABER workflow definitions
- **Templates**: Reusable project or component templates
- **Hooks**: Lifecycle hooks for automation
- **Commands**: Custom slash commands

### Architecture

```
Registry Resolution Flow:
┌─────────────────────────────────────────────┐
│  1. Check Local (.fractary/)                │
│     └─ Project-specific installations       │
└─────────────────────────────────────────────┘
                  ↓ (if not found)
┌─────────────────────────────────────────────┐
│  2. Check Global (~/.fractary/registry/)    │
│     └─ User-wide installations              │
└─────────────────────────────────────────────┘
                  ↓ (if not found)
┌─────────────────────────────────────────────┐
│  3. Fetch from Remote Registries            │
│     ├─ Check cache (TTL-based)              │
│     ├─ Fetch registry manifest              │
│     ├─ Fetch plugin manifest                │
│     └─ Download & verify components         │
└─────────────────────────────────────────────┘
```

### SDK Components

| Component | Purpose |
|-----------|---------|
| **Resolver** | Three-tier component resolution (local → global → remote) |
| **Installer** | Plugin installation with checksum verification |
| **ConfigManager** | Load/save/merge registry configurations |
| **ManifestCacheManager** | TTL-based manifest caching |
| **LocalResolver** | File system-based component discovery |
| **ManifestResolver** | Remote manifest fetching and validation |

### Usage in CLI Tools

The Registry SDK is designed to be consumed by the `fractary/cli` project. Example integration:

```typescript
// In fractary/cli project
import { Registry } from '@fractary/forge';

export async function forgeInstallCommand(pluginName: string, options: any) {
  try {
    const result = await Registry.installer.installPlugin(pluginName, {
      scope: options.global ? 'global' : 'local',
      force: options.force,
      agentsOnly: options.agentsOnly,
      toolsOnly: options.toolsOnly,
      dryRun: options.dryRun,
    });

    console.log(`✓ Installed ${result.plugin.name}@${result.plugin.version}`);

    if (result.installed.agents > 0) {
      console.log(`  • ${result.installed.agents} agents`);
    }
    if (result.installed.tools > 0) {
      console.log(`  • ${result.installed.tools} tools`);
    }
    // ... more output
  } catch (error) {
    console.error(`✗ Installation failed: ${error.message}`);
    process.exit(1);
  }
}
```

### Documentation

- **[Registry SDK Documentation](./src/registry/README.md)** - Complete SDK usage guide
- **[SPEC-FORGE-005](./docs/specs/SPEC-FORGE-005-REGISTRY-MANIFEST-SYSTEM.md)** - Registry manifest specification
- **CLI Integration Spec** (Coming: SPEC-FORGE-006) - How fractary/cli should integrate

### Example: Installing from Multiple Registries

```typescript
import { Registry } from '@fractary/forge';

// Configure multiple registries with priority
await Registry.configManager.addRegistry({
  name: 'fractary-core',
  type: 'manifest',
  url: 'https://raw.githubusercontent.com/fractary/plugins/main/registry.json',
  priority: 1, // Highest priority
});

await Registry.configManager.addRegistry({
  name: 'company-internal',
  type: 'manifest',
  url: 'https://internal.example.com/registry.json',
  priority: 2,
});

// Resolve will check registries in priority order
const component = await Registry.resolver.resolve('faber-agent', 'agent', {
  remoteOnly: false, // Check local/global first
});
```

---

## 🔄 Exporters Module

The Exporters module (`src/exporters/`) converts Fractary YAML definitions to framework-specific formats, enabling seamless integration with popular AI frameworks and workflow automation tools.

### Supported Formats

| Format | Output | Use Case |
|--------|--------|----------|
| **LangChain** | Python code with LangChain/LangGraph | Deploy agents in Python LangChain applications |
| **Claude Code** | Markdown files for `.claude/` directory | Use agents in Claude Code projects |
| **n8n** | JSON workflow definitions | Import as n8n automation workflows |

### Key Features

- **Multi-Format Support**: Export to LangChain, Claude Code, or n8n with a single API
- **Format-Specific Options**: Customize output for each framework
- **Batch Export**: Export entire plugins or individual components
- **Auto-Generation**: Automatically generates supporting files (requirements.txt, README.md, etc.)
- **Type Safety**: Full TypeScript support with format-specific option types

### Quick Example

```typescript
import { Exporters } from '@fractary/forge';
import type { AgentDefinition } from '@fractary/forge';

const agent: AgentDefinition = {
  name: 'my-agent',
  type: 'agent',
  description: 'A helpful AI assistant',
  llm: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    max_tokens: 4096,
  },
  system_prompt: 'You are a helpful assistant.',
  tools: ['web-search', 'file-reader'],
  version: '1.0.0',
  tags: ['assistant'],
};

// Export to all formats
for (const format of ['langchain', 'claude', 'n8n'] as const) {
  const result = await Exporters.exporter.export(
    { agents: [agent] },
    { format, outputDir: `./output/${format}` }
  );

  console.log(`${format}: ${result.summary.totalFiles} files`);
}
```

### Output Examples

**LangChain Export:**
```
langchain-export/
├── agents/
│   └── my-agent.py          # Python LangChain agent class
├── tools/
│   ├── web-search.py        # LangChain tool implementations
│   └── file-reader.py
├── requirements.txt         # Python dependencies
└── README.md                # Usage instructions
```

**Claude Code Export:**
```
claude-export/
├── .claude/
│   ├── agents/
│   │   └── my-agent.md      # Agent documentation
│   ├── tools/
│   │   └── web-search.md
│   └── mcp/
│       └── tools/
│           └── web-search.json  # MCP tool definition
└── README.md
```

**n8n Export:**
```
n8n-export/
├── workflows/
│   └── my-agent.json        # n8n workflow with webhook trigger
├── nodes/
│   └── web-search.json      # Custom node templates
└── README.md
```

### CLI Integration

The Exporters module is designed for consumption by the `fractary/cli` project:

```bash
# Export to LangChain
fractary forge export langchain @fractary/faber-plugin --output ./langchain

# Export to Claude Code
fractary forge export claude @fractary/faber-plugin --output ./claude

# Export to n8n
fractary forge export n8n @fractary/faber-plugin --output ./n8n
```

### Documentation

- **[Exporters SDK Documentation](./src/exporters/README.md)** - Complete usage guide
- **[LangChain Documentation](https://python.langchain.com/)** - LangChain framework
- **[Claude Code Documentation](https://docs.anthropic.com/claude-code)** - Claude Code format
- **[n8n Documentation](https://docs.n8n.io/)** - n8n workflow automation

---

## 📚 Documentation

### Comprehensive Guides

- **[API Reference](./docs/API.md)** - Complete API documentation
- **[User Guide](./docs/GUIDE.md)** - Step-by-step usage guide
- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture and design

### Specifications

#### Definition System
- **[SPEC-FORGE-001](./docs/specs/SPEC-FORGE-001-IMPLEMENTATION.md)** - Agent & Tool Definition System
- **[SPEC-FORGE-002](./docs/specs/SPEC-FORGE-002-IMPLEMENTATION.md)** - Registry & Resolution Implementation
- **[SPEC-FORGE-003](./docs/specs/SPEC-FORGE-003-STOCKYARD-INTEGRATION.md)** - Stockyard Integration (Future)
- **[SPEC-FORGE-004](./docs/specs/SPEC-FORGE-004-CLI-INTEGRATION.md)** - CLI Commands (Future)

#### Registry System
- **[SPEC-FORGE-005](./docs/specs/SPEC-FORGE-005-REGISTRY-MANIFEST-SYSTEM.md)** - Registry Manifest System
- **SPEC-FORGE-006** - CLI Integration Guide (Coming Soon)

### Examples

- **[Basic Usage](./examples/basic-usage.ts)** - Simple resolver and lockfile usage
- **[Fork Workflow](./examples/fork-workflow.ts)** - Forking and merging
- **[Update Management](./examples/update-management.ts)** - Checking and applying updates
- **[Custom Resolver](./examples/custom-resolver.ts)** - Building custom resolvers

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    @fractary/forge SDK                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
       ┌──────────────────────────────────────────┐
       │        DefinitionResolver                │
       │  (3-tier resolution: local→global→remote)│
       └──────────┬───────────────────────────────┘
                  │
      ┌───────────┼───────────┬───────────┐
      ▼           ▼           ▼           ▼
┌──────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Local   │ │ Global  │ │Stockyard│ │  Fork   │
│ Registry │ │ Registry│ │ Client  │ │ Manager │
└──────────┘ └─────────┘ └─────────┘ └─────────┘
      │           │           │           │
      └───────────┴───────────┴───────────┘
                  │
      ┌───────────┼───────────┬───────────┐
      ▼           ▼           ▼           ▼
┌──────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Lockfile │ │Manifest │ │  Update │ │Dependency│
│ Manager  │ │ Manager │ │ Manager │ │ Resolver│
└──────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **DefinitionResolver** | Resolves agents/tools from local, global, or remote registries |
| **LockfileManager** | Generates and validates lockfiles with integrity hashes |
| **ManifestManager** | Manages package metadata and version information |
| **UpdateChecker** | Detects available updates and breaking changes |
| **UpdateManager** | Applies updates with conflict resolution |
| **ForkManager** | Manages forking and upstream merging workflows |
| **DependencyResolver** | Builds dependency trees and detects cycles |
| **InheritanceResolver** | Resolves definition inheritance chains |

---

## 💡 Use Cases

### 1. CLI Tool Integration

Perfect for building CLI tools that manage AI agents and tools:

```typescript
// In your CLI tool (e.g., fractary/cli)
import { DefinitionResolver, LockfileManager } from '@fractary/forge';

async function installAgent(name: string) {
  const resolver = new DefinitionResolver(/* config */);
  const resolved = await resolver.resolveAgent(name);

  console.log(`Installed ${resolved.definition.name}@${resolved.version}`);

  // Update lockfile
  const lockfileManager = new LockfileManager(resolver);
  await lockfileManager.generate({ force: true });
}
```

### 2. Agent Marketplaces

Build marketplaces for discovering and installing agents:

```typescript
import { StockyardClient } from '@fractary/forge';

const client = new StockyardClient({
  url: 'https://stockyard.fractary.dev',
});

// Search for agents
const results = await client.search('data analysis', {
  type: 'agent',
  page: 1,
  pageSize: 20,
});

for (const result of results.results) {
  console.log(`${result.name} - ${result.description}`);
  console.log(`  Downloads: ${result.downloads}`);
  console.log(`  Rating: ${result.rating}/5`);
}
```

### 3. Custom Agent Platforms

Integrate with custom agent platforms:

```typescript
import { DefinitionResolver } from '@fractary/forge';

class CustomAgentPlatform {
  private resolver: DefinitionResolver;

  constructor() {
    this.resolver = new DefinitionResolver(/* config */);
  }

  async loadAgent(name: string) {
    const resolved = await this.resolver.resolveAgent(name);

    // Use the agent definition to configure your platform
    return {
      name: resolved.definition.name,
      model: resolved.definition.model,
      tools: await this.loadTools(resolved.definition.tools),
      prompt: resolved.definition.prompt,
    };
  }

  private async loadTools(toolNames: string[]) {
    const tools = [];
    for (const toolName of toolNames) {
      const resolved = await this.resolver.resolveTool(toolName);
      tools.push(resolved.definition);
    }
    return tools;
  }
}
```

### 4. Development Workflows

Streamline agent development with fork workflows:

```typescript
import { ForkManager } from '@fractary/forge';

// Fork a base agent for customization
await forkManager.forkAgent({
  sourceName: 'base-coding-agent',
  targetName: 'my-coding-agent',
  customizations: {
    prompt: 'Customized for TypeScript development...',
  },
});

// Develop and test locally
// ...

// When base-coding-agent gets updates, merge them in
const mergeResult = await forkManager.mergeUpstreamAgent('my-coding-agent');
```

---

## 🛠️ Development

### Setup

```bash
# Clone the repository
git clone https://github.com/fractary/forge.git
cd forge

# Install dependencies
npm install

# Build
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting & Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
forge/
├── src/
│   ├── definitions/          # Definition System (lockfile-based)
│   │   ├── schemas/          # Zod schemas
│   │   ├── loaders/          # YAML loaders
│   │   ├── registry/         # Definition registry & resolution
│   │   │   ├── resolver.ts
│   │   │   ├── lockfile/
│   │   │   ├── manifest/
│   │   │   ├── dependency/
│   │   │   ├── fork/
│   │   │   ├── update/
│   │   │   └── stockyard/
│   │   └── errors/           # Error handling
│   ├── registry/             # Registry System (plugin-based)
│   │   ├── schemas/          # Manifest & config schemas
│   │   ├── resolvers/        # Local & remote resolvers
│   │   ├── cache.ts          # Manifest caching
│   │   ├── config-manager.ts # Configuration management
│   │   ├── resolver.ts       # Main 3-tier resolver
│   │   ├── installer.ts      # Plugin installer
│   │   ├── index.ts          # Public SDK exports
│   │   └── README.md         # SDK documentation
│   ├── logger/               # Logging utilities
│   ├── errors/               # Error classes
│   └── index.ts              # Main package exports
├── docs/                     # Documentation
│   ├── API.md
│   ├── GUIDE.md
│   ├── ARCHITECTURE.md
│   └── specs/                # Implementation specs
├── examples/                 # Usage examples
├── dist/                     # Compiled output
└── tests/                    # Test files
```

---

## 📄 License

MIT © Fractary

---

## 🔗 Links

- **[GitHub Repository](https://github.com/fractary/forge)** - Source code
- **[npm Package](https://www.npmjs.com/package/@fractary/forge)** - npm registry
- **[Documentation](https://developers.fractary.com/forge)** - Full documentation
- **[CLI Tool](https://github.com/fractary/cli)** - fractary CLI integration
- **[Issues](https://github.com/fractary/forge/issues)** - Bug reports and feature requests
- **[Changelog](./CHANGELOG.md)** - Version history

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/fractary/forge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fractary/forge/discussions)
- **Email**: support@fractary.com

---

**Made with ❤️ by the Fractary team**
