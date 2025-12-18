# Fractary Forge API Reference

Complete API reference for the Fractary Forge SDK and CLI.

## Table of Contents

- [SDK API](#sdk-api)
  - [ForgeClient](#forgeclient)
  - [Agents API](#agents-api)
  - [Tools API](#tools-api)
  - [Plugins API](#plugins-api)
  - [Cache API](#cache-api)
  - [Resolvers API](#resolvers-api)
- [CLI Reference](#cli-reference)
- [Types](#types)
- [Error Handling](#error-handling)

## SDK API

### ForgeClient

Main entry point for the Forge SDK.

```typescript
import { ForgeClient } from '@fractary/forge';

const client = new ForgeClient(config?: ForgeConfig);
```

#### Configuration

```typescript
interface ForgeConfig {
  /**
   * Path to configuration file
   * @default '.fractary/forge.config.json'
   */
  configPath?: string;

  /**
   * Resolver configuration
   */
  resolvers?: {
    local?: LocalResolverConfig;
    global?: GlobalResolverConfig;
    remote?: RemoteResolverConfig;
  };

  /**
   * Cache configuration
   */
  cache?: CacheConfig;

  /**
   * Custom resolvers
   */
  customResolvers?: Resolver[];

  /**
   * Logger configuration
   */
  logger?: LoggerConfig;
}
```

#### Local Resolver Config

```typescript
interface LocalResolverConfig {
  /**
   * Enable local resolver
   * @default true
   */
  enabled?: boolean;

  /**
   * Paths to search for local assets
   * @default ['.fractary/agents', '.fractary/tools', '.fractary/workflows']
   */
  paths?: string[];
}
```

#### Global Resolver Config

```typescript
interface GlobalResolverConfig {
  /**
   * Enable global resolver
   * @default true
   */
  enabled?: boolean;

  /**
   * Path to global registry
   * @default '~/.fractary/registry'
   */
  path?: string;
}
```

#### Remote Resolver Config

```typescript
interface RemoteResolverConfig {
  /**
   * Enable remote resolver
   * @default true
   */
  enabled?: boolean;

  /**
   * Remote registries
   */
  registries?: RegistryConfig[];
}

interface RegistryConfig {
  /**
   * Registry name
   */
  name: string;

  /**
   * Registry type
   */
  type: 'manifest';

  /**
   * Registry URL
   */
  url: string;

  /**
   * Enable this registry
   * @default true
   */
  enabled?: boolean;

  /**
   * Priority (1 = highest)
   * @default 99
   */
  priority?: number;

  /**
   * Authentication token
   */
  token?: string;
}
```

#### Cache Config

```typescript
interface CacheConfig {
  /**
   * Enable caching
   * @default true
   */
  enabled?: boolean;

  /**
   * Cache TTL in seconds
   * @default 3600
   */
  ttl?: number;

  /**
   * Maximum cache size
   * @default '100MB'
   */
  maxSize?: string;

  /**
   * Cache directory
   * @default '~/.fractary/cache'
   */
  cacheDir?: string;
}
```

### Agents API

Manage AI agent definitions.

#### client.agents.list()

List all available agents.

```typescript
const agents = await client.agents.list(options?: ListOptions);
```

**Options:**

```typescript
interface ListOptions {
  /**
   * Filter by source
   */
  source?: 'local' | 'global' | 'remote';

  /**
   * Filter by tag
   */
  tag?: string;

  /**
   * Include metadata
   * @default false
   */
  includeMetadata?: boolean;
}
```

**Returns:**

```typescript
interface AgentListItem {
  name: string;
  version: string;
  source: 'local' | 'global' | 'remote';
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}
```

#### client.agents.get()

Get an agent definition.

```typescript
const agent = await client.agents.get(name: string, options?: GetOptions);
```

**Options:**

```typescript
interface GetOptions {
  /**
   * Specific version
   */
  version?: string;

  /**
   * Include resolved dependencies
   * @default false
   */
  includeTools?: boolean;

  /**
   * Include workflows
   * @default false
   */
  includeWorkflows?: boolean;
}
```

**Returns:**

```typescript
interface Agent {
  name: string;
  version: string;
  type: 'agent';
  description?: string;
  llm: LLMConfig;
  systemPrompt: string;
  tools?: string[];
  workflows?: string[];
  tags?: string[];
  config?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}
```

#### client.agents.create()

Create a new agent definition.

```typescript
const agent = await client.agents.create(definition: AgentDefinition);
```

**Parameters:**

```typescript
interface AgentDefinition {
  name: string;
  version: string;
  description?: string;
  llm: LLMConfig;
  systemPrompt: string;
  tools?: string[];
  workflows?: string[];
  tags?: string[];
  config?: Record<string, any>;
}
```

**Returns:**

```typescript
interface CreateResult {
  name: string;
  version: string;
  path: string;
}
```

#### client.agents.validate()

Validate an agent definition.

```typescript
const validation = await client.agents.validate(name: string);
```

**Returns:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}
```

#### client.agents.delete()

Delete an agent definition.

```typescript
await client.agents.delete(name: string, options?: DeleteOptions);
```

**Options:**

```typescript
interface DeleteOptions {
  /**
   * Delete from specific source
   */
  source?: 'local' | 'global';

  /**
   * Force delete even if dependencies exist
   * @default false
   */
  force?: boolean;
}
```

### Tools API

Manage tool definitions.

#### client.tools.list()

List all available tools.

```typescript
const tools = await client.tools.list(options?: ListOptions);
```

**Returns:**

```typescript
interface ToolListItem {
  name: string;
  version: string;
  source: 'local' | 'global' | 'remote';
  description?: string;
  tags?: string[];
}
```

#### client.tools.get()

Get a tool definition.

```typescript
const tool = await client.tools.get(name: string, options?: GetOptions);
```

**Returns:**

```typescript
interface Tool {
  name: string;
  version: string;
  type: 'tool';
  description?: string;
  parameters: JSONSchema;
  implementation: ToolImplementation;
  tags?: string[];
  config?: Record<string, any>;
}

interface ToolImplementation {
  type: 'function' | 'http' | 'mcp';
  handler?: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  server?: string;
  tool?: string;
}
```

#### client.tools.create()

Create a new tool definition.

```typescript
const tool = await client.tools.create(definition: ToolDefinition);
```

#### client.tools.validate()

Validate a tool definition.

```typescript
const validation = await client.tools.validate(name: string);
```

### Plugins API

Manage plugin installations.

#### client.plugins.list()

List installed plugins.

```typescript
const plugins = await client.plugins.list(options?: ListOptions);
```

**Returns:**

```typescript
interface PluginListItem {
  name: string;
  version: string;
  source: 'local' | 'global';
  description?: string;
  components: {
    agents: number;
    tools: number;
    workflows: number;
  };
}
```

#### client.plugins.install()

Install a plugin.

```typescript
const result = await client.plugins.install(
  name: string,
  options?: InstallOptions
);
```

**Options:**

```typescript
interface InstallOptions {
  /**
   * Install globally
   * @default false
   */
  global?: boolean;

  /**
   * Specific version
   */
  version?: string;

  /**
   * Force reinstall
   * @default false
   */
  force?: boolean;

  /**
   * Install agents only
   * @default false
   */
  agentsOnly?: boolean;

  /**
   * Install tools only
   * @default false
   */
  toolsOnly?: boolean;

  /**
   * Dry run (don't actually install)
   * @default false
   */
  dryRun?: boolean;
}
```

**Returns:**

```typescript
interface InstallResult {
  plugin: {
    name: string;
    version: string;
  };
  installed: {
    agents: number;
    tools: number;
    workflows: number;
  };
  path: string;
}
```

#### client.plugins.uninstall()

Uninstall a plugin.

```typescript
await client.plugins.uninstall(name: string, options?: UninstallOptions);
```

**Options:**

```typescript
interface UninstallOptions {
  /**
   * Uninstall from global registry
   * @default false
   */
  global?: boolean;
}
```

#### client.plugins.search()

Search for plugins in registries.

```typescript
const results = await client.plugins.search(query: string, options?: SearchOptions);
```

**Options:**

```typescript
interface SearchOptions {
  /**
   * Maximum results
   * @default 20
   */
  limit?: number;

  /**
   * Filter by tag
   */
  tag?: string;
}
```

**Returns:**

```typescript
interface SearchResult {
  name: string;
  version: string;
  description?: string;
  registry: string;
  tags?: string[];
  downloads?: number;
}
```

### Cache API

Manage the local cache.

#### client.cache.getStats()

Get cache statistics.

```typescript
const stats = await client.cache.getStats();
```

**Returns:**

```typescript
interface CacheStats {
  totalEntries: number;
  freshEntries: number;
  staleEntries: number;
  totalSize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}
```

#### client.cache.clear()

Clear cache entries.

```typescript
await client.cache.clear(options?: ClearOptions);
```

**Options:**

```typescript
interface ClearOptions {
  /**
   * Pattern to match
   */
  pattern?: string;

  /**
   * Clear stale entries only
   * @default false
   */
  staleOnly?: boolean;
}
```

#### client.cache.invalidate()

Invalidate specific cache entries.

```typescript
await client.cache.invalidate(key: string);
```

### Resolvers API

Work with asset resolution.

#### client.resolve()

Resolve an asset with all dependencies.

```typescript
const resolved = await client.resolve(
  name: string,
  type: 'agent' | 'tool' | 'workflow',
  options?: ResolveOptions
);
```

**Options:**

```typescript
interface ResolveOptions {
  /**
   * Specific version
   */
  version?: string;

  /**
   * Include dependencies
   * @default true
   */
  includeDependencies?: boolean;

  /**
   * Maximum depth for dependency resolution
   * @default 10
   */
  maxDepth?: number;
}
```

**Returns:**

```typescript
interface ResolvedAsset {
  name: string;
  version: string;
  type: 'agent' | 'tool' | 'workflow';
  source: 'local' | 'global' | 'remote';
  content: string;
  metadata: Record<string, any>;
  dependencies?: ResolvedAsset[];
}
```

## CLI Reference

See [Command Reference](./guides/command-reference.md) for complete CLI documentation.

## Types

### Common Types

```typescript
/**
 * JSON Schema for tool parameters
 */
type JSONSchema = {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
};

/**
 * Version constraint
 */
type VersionConstraint = string; // Semver format: "^1.0.0", "~1.0.0", "1.0.0"

/**
 * Asset source
 */
type AssetSource = 'local' | 'global' | 'remote';

/**
 * Asset type
 */
type AssetType = 'agent' | 'tool' | 'workflow' | 'template' | 'hook' | 'command';
```

## Error Handling

### Error Classes

```typescript
/**
 * Base error class
 */
class ForgeError extends Error {
  code: string;
  details?: any;
}

/**
 * Asset not found
 */
class AssetNotFoundError extends ForgeError {
  code = 'ASSET_NOT_FOUND';
}

/**
 * Validation error
 */
class ValidationError extends ForgeError {
  code = 'VALIDATION_ERROR';
  errors: Array<{ field: string; message: string }>;
}

/**
 * Resolution error
 */
class ResolutionError extends ForgeError {
  code = 'RESOLUTION_ERROR';
}

/**
 * Cache error
 */
class CacheError extends ForgeError {
  code = 'CACHE_ERROR';
}

/**
 * Network error
 */
class NetworkError extends ForgeError {
  code = 'NETWORK_ERROR';
}
```

### Error Handling Examples

```typescript
import {
  ForgeClient,
  AssetNotFoundError,
  ValidationError
} from '@fractary/forge';

const client = new ForgeClient();

try {
  const agent = await client.agents.get('my-agent');
} catch (error) {
  if (error instanceof AssetNotFoundError) {
    console.error('Agent not found:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation errors:');
    for (const err of error.errors) {
      console.error(`  ${err.field}: ${err.message}`);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Next Steps

- Explore [Examples](./examples/basic-usage.md)
- Read the [Architecture](./ARCHITECTURE.md) documentation
- Check out the [Developer Guide](./DEVELOPER.md)
