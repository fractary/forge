# Fractary Forge SDK Guide

Complete guide for using the Fractary Forge JavaScript/TypeScript SDK.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Installation

### NPM

```bash
npm install @fractary/forge
```

### Yarn

```bash
yarn add @fractary/forge
```

### PNPM

```bash
pnpm add @fractary/forge
```

### Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.3 (for TypeScript projects)

## Quick Start

### Basic Usage

```typescript
import { ForgeClient } from '@fractary/forge';

// Initialize client
const client = new ForgeClient();

// List agents
const agents = await client.agents.list();
console.log('Available agents:', agents);

// Get specific agent
const agent = await client.agents.get('my-agent');
console.log('Agent:', agent);
```

### With Configuration

```typescript
import { ForgeClient } from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

const client = new ForgeClient({
  resolvers: {
    local: {
      enabled: true,
      paths: [
        path.join(process.cwd(), '.fractary/agents'),
        path.join(process.cwd(), '.fractary/tools'),
      ]
    },
    global: {
      enabled: true,
      path: path.join(os.homedir(), '.fractary/registry')
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
    ttl: 3600,
    maxSize: '100MB'
  }
});
```

## Core Concepts

### ForgeClient

The main entry point for the SDK. All operations go through the client.

```typescript
class ForgeClient {
  // API surfaces
  readonly agents: AgentsAPI;
  readonly tools: ToolsAPI;
  readonly plugins: PluginsAPI;
  readonly cache: CacheAPI;

  // Core methods
  async resolve(name: string, type: AssetType): Promise<ResolvedAsset>;
}
```

### Resolution

Forge uses a three-tier resolution strategy:

1. **Local** - `.fractary/` directory in current project
2. **Global** - `~/.fractary/registry/` user-wide installation
3. **Remote** - Configured registries (GitHub, etc.)

```typescript
// Resolve an agent (tries local → global → remote)
const agent = await client.agents.get('my-agent');

// Force resolution from specific source
const agents = await client.agents.list({ source: 'local' });
```

### Asset Types

Forge manages different types of assets:

```typescript
type AssetType = 'agent' | 'tool' | 'workflow' | 'template' | 'hook' | 'command';
```

### Versioning

Forge uses semantic versioning (semver):

```typescript
// Exact version
const agent = await client.agents.get('my-agent', { version: '1.0.0' });

// Version range (uses version constraint in definition)
const agent = await client.agents.get('my-agent', { version: '^1.0.0' });

// Latest version (default)
const agent = await client.agents.get('my-agent');
```

## API Reference

See [API.md](./API.md) for complete API documentation.

### Agents API

```typescript
// List all agents
const agents = await client.agents.list();

// Get specific agent
const agent = await client.agents.get('my-agent');

// Get with dependencies
const agent = await client.agents.get('my-agent', {
  includeTools: true,
  includeWorkflows: true
});

// Create new agent
const result = await client.agents.create({
  name: 'new-agent',
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
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Delete agent
await client.agents.delete('my-agent');
```

### Tools API

```typescript
// List all tools
const tools = await client.tools.list();

// Get specific tool
const tool = await client.tools.get('web-search');

// Create new tool
const result = await client.tools.create({
  name: 'new-tool',
  version: '1.0.0',
  description: 'A new tool',
  parameters: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Input parameter'
      }
    },
    required: ['input']
  },
  implementation: {
    type: 'function',
    handler: './handlers/new-tool.js'
  }
});

// Validate tool
const validation = await client.tools.validate('new-tool');
```

### Plugins API

```typescript
// List installed plugins
const plugins = await client.plugins.list();

// Search for plugins
const results = await client.plugins.search('faber', {
  limit: 10,
  tag: 'workflow'
});

// Install plugin
const result = await client.plugins.install('@fractary/faber-plugin', {
  global: true,
  version: '^1.0.0'
});

// Uninstall plugin
await client.plugins.uninstall('@fractary/faber-plugin', {
  global: true
});

// Get plugin info
const info = await client.plugins.info('@fractary/faber-plugin');
```

### Cache API

```typescript
// Get cache statistics
const stats = await client.cache.getStats();
console.log('Total entries:', stats.totalEntries);
console.log('Cache size:', stats.totalSize);

// Clear cache
await client.cache.clear();

// Clear with pattern
await client.cache.clear({ pattern: '@fractary/*' });

// Clear stale entries only
await client.cache.clear({ staleOnly: true });

// Invalidate specific entry
await client.cache.invalidate('registry-manifest-fractary-core');
```

### Resolution API

```typescript
// Resolve asset with dependencies
const resolved = await client.resolve('my-agent', 'agent', {
  version: '^1.0.0',
  includeDependencies: true,
  maxDepth: 10
});

console.log('Resolved:', resolved.name);
console.log('Dependencies:', resolved.dependencies);
```

## Advanced Usage

### Custom Resolvers

Implement custom resolution logic:

```typescript
import { Resolver, ResolvedAsset } from '@fractary/forge';

class CustomResolver implements Resolver {
  name = 'custom';

  async resolve(
    name: string,
    type: 'agent' | 'tool' | 'workflow',
    version?: string
  ): Promise<ResolvedAsset | null> {
    // Custom resolution logic
    // e.g., fetch from database, API, etc.
    return {
      name,
      version: version || '1.0.0',
      type,
      source: 'custom',
      content: '...',
      metadata: {}
    };
  }

  async list(type?: string): Promise<Array<{ name: string; version: string }>> {
    // List available assets
    return [];
  }
}

// Use custom resolver
const client = new ForgeClient({
  customResolvers: [new CustomResolver()]
});
```

### Error Handling

```typescript
import {
  ForgeClient,
  AssetNotFoundError,
  ValidationError,
  ResolutionError,
  CacheError,
  NetworkError
} from '@fractary/forge';

const client = new ForgeClient();

try {
  const agent = await client.agents.get('my-agent');
} catch (error) {
  if (error instanceof AssetNotFoundError) {
    console.error('Agent not found');
  } else if (error instanceof ValidationError) {
    console.error('Validation failed:', error.errors);
  } else if (error instanceof ResolutionError) {
    console.error('Resolution failed:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
    // Retry logic here
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Logging

```typescript
import { ForgeClient } from '@fractary/forge';

const client = new ForgeClient({
  logger: {
    level: 'debug', // 'error' | 'warn' | 'info' | 'debug'
    prefix: '[Forge]'
  }
});

// Custom logger
import { Logger } from '@fractary/forge';

class CustomLogger implements Logger {
  error(message: string, ...args: any[]): void {
    // Custom error logging
  }

  warn(message: string, ...args: any[]): void {
    // Custom warning logging
  }

  info(message: string, ...args: any[]): void {
    // Custom info logging
  }

  debug(message: string, ...args: any[]): void {
    // Custom debug logging
  }
}

const client = new ForgeClient({
  logger: new CustomLogger()
});
```

### TypeScript Usage

Full TypeScript support with comprehensive types:

```typescript
import type {
  Agent,
  Tool,
  Workflow,
  ResolvedAsset,
  ForgeConfig,
  AgentDefinition,
  ToolDefinition,
  LLMConfig,
  ValidationResult
} from '@fractary/forge';

// Type-safe agent creation
const agentDef: AgentDefinition = {
  name: 'my-agent',
  version: '1.0.0',
  description: 'A helpful assistant',
  llm: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 4096
  },
  systemPrompt: 'You are a helpful assistant.',
  tools: ['web-search'],
  tags: ['assistant']
};

const result = await client.agents.create(agentDef);

// Type-safe tool definition
const toolDef: ToolDefinition = {
  name: 'my-tool',
  version: '1.0.0',
  description: 'A custom tool',
  parameters: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Input parameter'
      }
    },
    required: ['input']
  },
  implementation: {
    type: 'function',
    handler: './handlers/my-tool.js'
  }
};
```

### Async Iteration

Work with large lists efficiently:

```typescript
// List agents with filtering
for await (const agent of client.agents.listIterator({ tag: 'assistant' })) {
  console.log(`Processing ${agent.name}...`);
  // Process each agent
}
```

### Batch Operations

```typescript
// Batch install plugins
const plugins = [
  '@fractary/faber-plugin',
  '@fractary/codex-plugin',
  '@company/custom-plugin'
];

const results = await Promise.all(
  plugins.map(name => client.plugins.install(name, { global: true }))
);

console.log(`Installed ${results.length} plugins`);
```

## Best Practices

### 1. Use Configuration Files

```typescript
// Load configuration from file
import { ForgeClient } from '@fractary/forge';
import { loadConfig } from '@fractary/forge/config';

const config = await loadConfig('.fractary/forge.config.json');
const client = new ForgeClient(config);
```

### 2. Handle Errors Gracefully

```typescript
async function getAgent(name: string) {
  try {
    return await client.agents.get(name);
  } catch (error) {
    if (error instanceof AssetNotFoundError) {
      // Try fallback
      return await client.agents.get('default-agent');
    }
    throw error;
  }
}
```

### 3. Cache Wisely

```typescript
// Configure appropriate TTL
const client = new ForgeClient({
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour for production
    // ttl: 60,  // 1 minute for development
  }
});
```

### 4. Validate Before Using

```typescript
async function useAgent(name: string) {
  const validation = await client.agents.validate(name);

  if (!validation.valid) {
    throw new Error(`Invalid agent: ${validation.errors.join(', ')}`);
  }

  const agent = await client.agents.get(name);
  // Use agent...
}
```

### 5. Type Everything

```typescript
// Use TypeScript for safety
import type { Agent, Tool } from '@fractary/forge';

async function processAgent(name: string): Promise<void> {
  const agent: Agent = await client.agents.get(name);
  const tools: Tool[] = await Promise.all(
    (agent.tools || []).map(toolName => client.tools.get(toolName))
  );

  // Process with full type safety
}
```

### 6. Clean Up Resources

```typescript
// Clean up when done
const client = new ForgeClient();

try {
  // Use client...
} finally {
  await client.destroy();
}
```

## Troubleshooting

### Issue: Module Not Found

```bash
# Ensure package is installed
npm install @fractary/forge

# Check package.json
cat package.json | grep @fractary/forge
```

### Issue: TypeScript Errors

```typescript
// Ensure types are imported correctly
import type { Agent } from '@fractary/forge';

// Check tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

### Issue: Resolution Failures

```typescript
// Check resolver configuration
const client = new ForgeClient({
  resolvers: {
    local: {
      enabled: true,
      paths: ['.fractary/agents'] // Ensure path exists
    }
  }
});

// Enable debug logging
const client = new ForgeClient({
  logger: { level: 'debug' }
});
```

### Issue: Cache Problems

```bash
# Clear cache manually
rm -rf ~/.fractary/cache/

# Or programmatically
await client.cache.clear();
```

### Issue: Network Timeouts

```typescript
// Increase timeout (if your resolver supports it)
const client = new ForgeClient({
  resolvers: {
    remote: {
      enabled: true,
      timeout: 30000 // 30 seconds
    }
  }
});
```

## Examples

See [examples directory](./examples/) for more:

- [Basic Usage](./examples/basic-usage.md)
- [Advanced Workflows](./examples/advanced-workflows.md)

## API Documentation

See [API Reference](./API.md) for complete API documentation.

## Next Steps

- Read [Architecture](./ARCHITECTURE.md) to understand the design
- Explore [Developer Guide](./DEVELOPER.md) to contribute
- Check out [MCP Server](./MCP_SERVER.md) for Claude integration
