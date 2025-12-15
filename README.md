# @fractary/forge

> **Core SDK for Agent & Tool Registry and Resolution**

`@fractary/forge` is a comprehensive TypeScript SDK for managing, resolving, and distributing AI agent and tool definitions across local, global, and remote registries with lockfile support, dependency management, and fork workflows.

[![npm version](https://img.shields.io/npm/v/@fractary/forge)](https://www.npmjs.com/package/@fractary/forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Documentation](#documentation)
- [Architecture](#architecture)
- [Use Cases](#use-cases)
- [Development](#development)
- [License](#license)

---

## ✨ Features

### Registry & Resolution
- **3-Tier Resolution**: Local → Global → Stockyard (remote marketplace)
- **Version Management**: Semver-based version constraints and resolution
- **Dependency Resolution**: Automatic dependency tree building with cycle detection
- **Inheritance System**: Agent/tool definition inheritance with `extends` keyword

### Lockfile & Manifests
- **Lockfile Generation**: Pin exact versions with SHA-256 integrity hashing
- **Manifest Management**: Track package metadata, versions, and update status
- **Update Detection**: Automatic detection of available updates with breaking change warnings

### Fork Workflows
- **Fork Management**: Fork agents/tools to local registry for customization
- **Three-Way Merge**: Merge upstream changes with conflict detection
- **Conflict Resolution**: Auto-resolve or manual conflict resolution strategies

### Developer Experience
- **TypeScript-First**: Full TypeScript support with comprehensive type definitions
- **Schema Validation**: Zod-based schema validation for agent/tool definitions
- **Error Handling**: Detailed error messages with context and suggestions
- **Extensible**: Plugin-based architecture for custom resolvers and handlers

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

### 1. Initialize Forge Configuration

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

## 📚 Documentation

### Comprehensive Guides

- **[API Reference](./docs/API.md)** - Complete API documentation
- **[User Guide](./docs/GUIDE.md)** - Step-by-step usage guide
- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture and design

### Specifications

- **[SPEC-FORGE-001](./docs/specs/SPEC-FORGE-001-IMPLEMENTATION.md)** - Agent & Tool Definition System
- **[SPEC-FORGE-002](./docs/specs/SPEC-FORGE-002-IMPLEMENTATION.md)** - Registry & Resolution Implementation
- **[SPEC-FORGE-003](./docs/specs/SPEC-FORGE-003-STOCKYARD-INTEGRATION.md)** - Stockyard Integration (Future)
- **[SPEC-FORGE-004](./docs/specs/SPEC-FORGE-004-CLI-INTEGRATION.md)** - CLI Commands (Future)

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
│   ├── definitions/          # Agent & Tool definitions
│   │   ├── schemas/          # Zod schemas
│   │   ├── loaders/          # YAML loaders
│   │   ├── registry/         # Registry & resolution
│   │   │   ├── resolver.ts
│   │   │   ├── lockfile/
│   │   │   ├── manifest/
│   │   │   ├── dependency/
│   │   │   ├── fork/
│   │   │   ├── update/
│   │   │   └── stockyard/
│   │   └── errors/           # Error handling
│   ├── logger/               # Logging utilities
│   ├── errors/               # Error classes
│   └── index.ts              # Main exports
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
