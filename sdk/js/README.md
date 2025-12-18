# @fractary/forge

> **Core SDK for AI Agent & Tool Management**

`@fractary/forge` is a comprehensive TypeScript SDK for managing, resolving, and distributing AI agents, tools, and workflows. It provides a flexible resolution system with local, global, and remote registry support.

[![npm version](https://img.shields.io/npm/v/@fractary/forge)](https://www.npmjs.com/package/@fractary/forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

---

## ✨ Features

- **3-Tier Resolution**: Local → Global → Remote registries
- **Plugin System**: Install and distribute agent/tool collections
- **Version Management**: Semver-based version constraints
- **Cache System**: TTL-based caching for performance
- **Type-Safe**: Full TypeScript support with Zod validation
- **Export Support**: Export to LangChain, Claude Code, n8n
- **Fork Workflows**: Fork and customize components with upstream merging

## 📦 Installation

```bash
npm install @fractary/forge
```

**Requirements:**
- Node.js >= 18.0.0
- TypeScript >= 5.3 (for TypeScript projects)

## 🚀 Quick Start

### Basic Usage

```typescript
import { ForgeClient } from '@fractary/forge';

// Initialize client
const client = new ForgeClient();

// List available agents
const agents = await client.agents.list();
console.log('Available agents:', agents);

// Get specific agent
const agent = await client.agents.get('my-agent');
console.log('Agent:', agent);

// Install plugin
await client.plugins.install('@fractary/faber-plugin', {
  global: true
});
```

### With Configuration

```typescript
import { ForgeClient } from '@fractary/forge';

const client = new ForgeClient({
  resolvers: {
    local: {
      enabled: true,
      paths: ['.fractary/agents', '.fractary/tools']
    },
    global: {
      enabled: true,
      path: '~/.fractary/registry'
    },
    remote: {
      enabled: true,
      registries: [
        {
          name: 'fractary-core',
          type: 'manifest',
          url: 'https://raw.githubusercontent.com/fractary/plugins/main/registry.json',
          priority: 1
        }
      ]
    }
  },
  cache: {
    enabled: true,
    ttl: 3600
  }
});
```

## 📚 Core API

### Agents

```typescript
// List agents
const agents = await client.agents.list({ source: 'local' });

// Get agent with dependencies
const agent = await client.agents.get('my-agent', {
  includeTools: true
});

// Create agent
await client.agents.create({
  name: 'my-agent',
  version: '1.0.0',
  llm: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7
  },
  systemPrompt: 'You are a helpful assistant.',
  tools: ['web-search']
});

// Validate agent
const validation = await client.agents.validate('my-agent');
```

### Tools

```typescript
// List tools
const tools = await client.tools.list();

// Get tool
const tool = await client.tools.get('web-search');

// Create tool
await client.tools.create({
  name: 'my-tool',
  version: '1.0.0',
  description: 'Custom tool',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' }
    }
  },
  implementation: {
    type: 'function',
    handler: './handlers/my-tool.js'
  }
});
```

### Plugins

```typescript
// Search plugins
const results = await client.plugins.search('faber');

// Install plugin
await client.plugins.install('@fractary/faber-plugin', {
  global: true
});

// List installed
const plugins = await client.plugins.list();

// Uninstall
await client.plugins.uninstall('@fractary/faber-plugin');
```

### Cache

```typescript
// Get stats
const stats = await client.cache.getStats();

// Clear cache
await client.cache.clear();

// Clear with pattern
await client.cache.clear({ pattern: '@fractary/*' });
```

## 🔧 Advanced Features

### Custom Resolvers

```typescript
import { Resolver, ResolvedAsset } from '@fractary/forge';

class CustomResolver implements Resolver {
  name = 'custom';

  async resolve(
    name: string,
    type: 'agent' | 'tool',
    version?: string
  ): Promise<ResolvedAsset | null> {
    // Custom resolution logic
    return null;
  }
}

const client = new ForgeClient({
  customResolvers: [new CustomResolver()]
});
```

### Error Handling

```typescript
import {
  AssetNotFoundError,
  ValidationError,
  ResolutionError
} from '@fractary/forge';

try {
  const agent = await client.agents.get('my-agent');
} catch (error) {
  if (error instanceof AssetNotFoundError) {
    console.error('Agent not found');
  } else if (error instanceof ValidationError) {
    console.error('Validation failed:', error.errors);
  }
}
```

### TypeScript Support

```typescript
import type {
  Agent,
  Tool,
  AgentDefinition,
  ToolDefinition
} from '@fractary/forge';

const agentDef: AgentDefinition = {
  name: 'my-agent',
  version: '1.0.0',
  llm: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022'
  },
  systemPrompt: 'You are helpful.'
};
```

## 📖 Documentation

- **[Complete Documentation](../../docs/README.md)** - Full documentation index
- **[SDK Guide](../../docs/SDK.md)** - Detailed SDK usage guide
- **[API Reference](../../docs/API.md)** - Complete API documentation
- **[Examples](../../docs/examples/basic-usage.md)** - Usage examples
- **[Architecture](../../docs/ARCHITECTURE.md)** - System design

## 🏗️ Architecture

```
ForgeClient
├── Agents API
├── Tools API
├── Plugins API
└── Cache API
      │
      ▼
Resolution Manager
├── Local Resolver (.fractary/)
├── Global Resolver (~/.fractary/registry/)
└── Remote Resolver (registries)
```

## 🛠️ Development

```bash
# Clone repository
git clone https://github.com/fractary/forge.git
cd forge/sdk/js

# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Watch mode
npm run dev
```

See [Developer Guide](../../docs/DEVELOPER.md) for contribution guidelines.

## 📄 License

MIT © [Fractary](https://fractary.com)

## 🔗 Links

- **[GitHub](https://github.com/fractary/forge)** - Source code
- **[NPM](https://www.npmjs.com/package/@fractary/forge)** - Package registry
- **[Documentation](../../docs/README.md)** - Full documentation
- **[CLI Tool](../cli/)** - Command-line interface
- **[MCP Server](../mcp/server/)** - Model Context Protocol server
- **[Issues](https://github.com/fractary/forge/issues)** - Bug reports

## 🤝 Related Packages

- **[@fractary/forge-cli](../cli/)** - Command-line interface
- **[@fractary/forge-mcp](../mcp/server/)** - MCP server for Claude Desktop

---

**Made with ❤️ by the Fractary team**
