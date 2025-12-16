# API Reference

Complete API documentation for `@fractary/forge` SDK.

---

## Table of Contents

- [Core Classes](#core-classes)
  - [DefinitionResolver](#definitionresolver)
  - [LockfileManager](#lockfilemanager)
  - [ManifestManager](#manifestmanager)
  - [UpdateChecker](#updatechecker)
  - [UpdateManager](#updatemanager)
  - [ForkManager](#forkmanager)
  - [DependencyResolver](#dependencyresolver)
- [Types](#types)
- [Schemas](#schemas)
- [Error Handling](#error-handling)

---

## Core Classes

### DefinitionResolver

Resolves agent and tool definitions from local, global, and remote registries.

#### Constructor

```typescript
constructor(config?: Partial<RegistryConfig>)
```

**Parameters:**
- `config` (optional): Registry configuration

**Example:**
```typescript
import { DefinitionResolver } from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

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
    enabled: false,
  },
});
```

#### Methods

##### `resolveAgent(name: string): Promise<ResolvedAgent>`

Resolve an agent by name and optional version.

**Parameters:**
- `name`: Agent name with optional version (e.g., `my-agent@^1.0.0`)

**Returns:** `Promise<ResolvedAgent>`

**Example:**
```typescript
const resolved = await resolver.resolveAgent('my-agent@^1.0.0');
console.log(resolved.definition.name); // 'my-agent'
console.log(resolved.version);          // '1.0.5'
console.log(resolved.source);           // 'local' | 'global' | 'stockyard'
console.log(resolved.path);             // '/path/to/agent.yaml'
```

**Throws:**
- `ForgeError` with `AGENT_NOT_FOUND` if agent cannot be resolved

##### `resolveTool(name: string): Promise<ResolvedTool>`

Resolve a tool by name and optional version.

**Parameters:**
- `name`: Tool name with optional version (e.g., `web-search@~2.0.0`)

**Returns:** `Promise<ResolvedTool>`

**Example:**
```typescript
const resolved = await resolver.resolveTool('web-search@~2.0.0');
console.log(resolved.definition.name); // 'web-search'
console.log(resolved.version);          // '2.0.3'
```

---

### LockfileManager

Manages lockfile generation, loading, and validation.

#### Constructor

```typescript
constructor(
  resolver: DefinitionResolver,
  projectRoot?: string
)
```

**Parameters:**
- `resolver`: DefinitionResolver instance
- `projectRoot` (optional): Project root directory (defaults to `process.cwd()`)

#### Methods

##### `generate(options?: LockfileGenerateOptions): Promise<Lockfile>`

Generate a lockfile from project usage.

**Parameters:**
- `options` (optional):
  - `force?: boolean` - Regenerate even if lockfile exists
  - `validate?: boolean` - Validate integrity after generation

**Returns:** `Promise<Lockfile>`

**Example:**
```typescript
import { LockfileManager } from '@fractary/forge';

const lockfileManager = new LockfileManager(resolver);

const lockfile = await lockfileManager.generate({
  force: true,
  validate: true,
});

console.log(`Locked ${Object.keys(lockfile.agents).length} agents`);
console.log(`Locked ${Object.keys(lockfile.tools).length} tools`);
```

##### `load(): Promise<Lockfile>`

Load existing lockfile.

**Returns:** `Promise<Lockfile>`

**Throws:**
- `ForgeError` with `LOCKFILE_INVALID` if lockfile doesn't exist or is invalid

**Example:**
```typescript
const lockfile = await lockfileManager.load();
```

##### `validate(lockfile?: Lockfile): Promise<LockfileValidationResult>`

Validate lockfile against current definitions.

**Parameters:**
- `lockfile` (optional): Lockfile to validate (loads from disk if omitted)

**Returns:** `Promise<LockfileValidationResult>`

**Example:**
```typescript
const validation = await lockfileManager.validate();

if (!validation.valid) {
  console.error('Lockfile validation failed:');
  validation.errors.forEach(err => {
    console.error(`  ${err.type}: ${err.name}`);
  });
}
```

##### `save(lockfile: Lockfile): Promise<void>`

Save lockfile to disk.

**Parameters:**
- `lockfile`: Lockfile to save

**Example:**
```typescript
await lockfileManager.save(lockfile);
```

---

### ManifestManager

Manages package manifests and metadata.

#### Constructor

```typescript
constructor(globalRegistryPath?: string)
```

**Parameters:**
- `globalRegistryPath` (optional): Global registry path

#### Methods

##### `getManifest(name: string): Promise<PackageManifest | null>`

Get manifest for a package.

**Parameters:**
- `name`: Package name

**Returns:** `Promise<PackageManifest | null>`

**Example:**
```typescript
import { ManifestManager } from '@fractary/forge';

const manifestManager = new ManifestManager();
const manifest = await manifestManager.getManifest('my-agent');

if (manifest) {
  console.log(`Latest version: ${manifest.latest}`);
  console.log(`Installed: ${manifest.installed_versions.join(', ')}`);
  console.log(`Update available: ${manifest.update_available}`);
}
```

##### `saveManifest(manifest: PackageManifest): Promise<void>`

Save manifest to disk.

**Parameters:**
- `manifest`: Manifest to save

##### `updateManifest(name: string, type: 'agent' | 'tool', options?: Partial<PackageManifest>): Promise<PackageManifest>`

Create or update a manifest.

**Parameters:**
- `name`: Package name
- `type`: Package type ('agent' or 'tool')
- `options` (optional): Partial manifest data to update

**Returns:** `Promise<PackageManifest>`

##### `trackFork(sourceName: string, forkedName: string): Promise<void>`

Track fork relationship in manifest.

**Parameters:**
- `sourceName`: Source package name
- `forkedName`: Forked package name

##### `listManifests(type?: 'agent' | 'tool'): Promise<PackageManifest[]>`

List all manifests.

**Parameters:**
- `type` (optional): Filter by type

**Returns:** `Promise<PackageManifest[]>`

---

### UpdateChecker

Detects available package updates.

#### Constructor

```typescript
constructor(
  lockfileManager: LockfileManager,
  manifestManager: ManifestManager
)
```

#### Methods

##### `checkUpdates(): Promise<UpdateCheckResult>`

Check for available updates across all packages.

**Returns:** `Promise<UpdateCheckResult>`

**Example:**
```typescript
import { UpdateChecker } from '@fractary/forge';

const updateChecker = new UpdateChecker(lockfileManager, manifestManager);
const result = await updateChecker.checkUpdates();

if (result.hasUpdates) {
  console.log(`${result.total} update(s) available`);
  console.log(updateChecker.formatUpdateSummary(result));

  if (result.breakingChanges.length > 0) {
    console.warn('Breaking changes detected!');
  }
}
```

##### `getAvailableVersions(name: string, currentVersion: string, strategy?: 'latest' | 'patch' | 'minor'): Promise<string[]>`

Get available versions for a package.

**Parameters:**
- `name`: Package name
- `currentVersion`: Current version
- `strategy` (optional): Update strategy (default: 'latest')

**Returns:** `Promise<string[]>` - Array of available versions

##### `isBreakingChange(from: string, to: string): boolean`

Check if an update is a breaking change.

**Parameters:**
- `from`: Current version
- `to`: Target version

**Returns:** `boolean`

##### `formatUpdateSummary(result: UpdateCheckResult): string`

Format update summary for display.

**Parameters:**
- `result`: Update check result

**Returns:** `string` - Formatted summary

---

### UpdateManager

Applies package updates.

#### Constructor

```typescript
constructor(
  resolver: DefinitionResolver,
  lockfileManager: LockfileManager,
  manifestManager: ManifestManager,
  updateChecker: UpdateChecker
)
```

#### Methods

##### `update(options?: UpdateOptions): Promise<UpdateResult>`

Update packages.

**Parameters:**
- `options` (optional):
  - `strategy?: 'latest' | 'patch' | 'minor'` - Update strategy (default: 'latest')
  - `includePrerelease?: boolean` - Include pre-release versions
  - `skipBreaking?: boolean` - Skip breaking changes (default: true)
  - `packages?: string[]` - Specific packages to update
  - `dryRun?: boolean` - Preview without applying

**Returns:** `Promise<UpdateResult>`

**Example:**
```typescript
import { UpdateManager } from '@fractary/forge';

const updateManager = new UpdateManager(
  resolver,
  lockfileManager,
  manifestManager,
  updateChecker
);

// Update all packages (skip breaking changes)
const result = await updateManager.update({
  strategy: 'latest',
  skipBreaking: true,
});

console.log(`Updated: ${result.updated.length}`);
console.log(`Failed: ${result.failed.length}`);
console.log(`Skipped: ${result.skipped.length}`);

for (const pkg of result.updated) {
  console.log(`✓ ${pkg.name}: ${pkg.from} → ${pkg.to}`);
}
```

##### `updatePackage(name: string, version?: string, options?: UpdateOptions): Promise<UpdateResult>`

Update a specific package.

**Parameters:**
- `name`: Package name
- `version` (optional): Target version
- `options` (optional): Update options

**Returns:** `Promise<UpdateResult>`

##### `rollback(name: string, version: string): Promise<void>`

Rollback a package to a previous version.

**Parameters:**
- `name`: Package name
- `version`: Target version to rollback to

**Example:**
```typescript
await updateManager.rollback('my-agent', '1.0.0');
```

---

### ForkManager

Manages forking and merging workflows.

#### Constructor

```typescript
constructor(
  resolver: DefinitionResolver,
  manifestManager: ManifestManager
)
```

#### Methods

##### `forkAgent(options: ForkOptions): Promise<void>`

Fork an agent to local registry.

**Parameters:**
- `options`:
  - `sourceName: string` - Source agent name
  - `targetName: string` - Target agent name
  - `customizations?: Record<string, any>` - Initial customizations

**Example:**
```typescript
import { ForkManager } from '@fractary/forge';

const forkManager = new ForkManager(resolver, manifestManager);

await forkManager.forkAgent({
  sourceName: 'base-agent',
  targetName: 'my-custom-agent',
  customizations: {
    description: 'My customized version',
    prompt: 'Custom system prompt...',
  },
});
```

##### `forkTool(options: ForkOptions): Promise<void>`

Fork a tool to local registry.

**Parameters:**
- `options`: Fork options (same as `forkAgent`)

##### `checkAgentUpstreamUpdates(forkedName: string): Promise<{ hasUpdate: boolean; current: string; latest: string }>`

Check for upstream updates for a forked agent.

**Parameters:**
- `forkedName`: Forked agent name

**Returns:** `Promise<{ hasUpdate: boolean; current: string; latest: string }>`

**Example:**
```typescript
const check = await forkManager.checkAgentUpstreamUpdates('my-custom-agent');

if (check.hasUpdate) {
  console.log(`Update available: ${check.current} → ${check.latest}`);
}
```

##### `checkToolUpstreamUpdates(forkedName: string): Promise<{ hasUpdate: boolean; current: string; latest: string }>`

Check for upstream updates for a forked tool.

##### `mergeUpstreamAgent(forkedName: string, options?: MergeOptions): Promise<MergeResult>`

Merge upstream changes into forked agent.

**Parameters:**
- `forkedName`: Forked agent name
- `options` (optional):
  - `strategy?: 'auto' | 'manual' | 'local' | 'upstream'` - Conflict resolution strategy
  - `confirm?: boolean` - Prompt for confirmation

**Returns:** `Promise<MergeResult>`

**Example:**
```typescript
const result = await forkManager.mergeUpstreamAgent('my-custom-agent', {
  strategy: 'auto',
});

if (!result.success) {
  console.log(`${result.conflicts.length} conflict(s) detected:`);
  result.conflicts.forEach(conflict => {
    console.log(`  ${conflict.path}:`);
    console.log(`    Local: ${JSON.stringify(conflict.local)}`);
    console.log(`    Upstream: ${JSON.stringify(conflict.upstream)}`);
  });
}
```

##### `mergeUpstreamTool(forkedName: string, options?: MergeOptions): Promise<MergeResult>`

Merge upstream changes into forked tool.

---

### DependencyResolver

Builds dependency trees and detects circular dependencies.

#### Constructor

```typescript
constructor(resolver: DefinitionResolver)
```

#### Methods

##### `buildDependencyTree(name: string, type: 'agent' | 'tool'): Promise<DependencyTree>`

Build complete dependency tree for a package.

**Parameters:**
- `name`: Package name
- `type`: Package type

**Returns:** `Promise<DependencyTree>`

**Example:**
```typescript
import { DependencyResolver } from '@fractary/forge';

const depResolver = new DependencyResolver(resolver);
const tree = await depResolver.buildDependencyTree('my-agent', 'agent');

console.log(`Root: ${tree.root}`);
console.log(`Dependencies: ${tree.nodes.size}`);

for (const [name, node] of tree.nodes) {
  console.log(`  ${name}@${node.version} (${node.type})`);
  if (node.dependencies.length > 0) {
    console.log(`    Depends on: ${node.dependencies.join(', ')}`);
  }
}
```

##### `detectCycles(graph: DependencyGraph): Cycle[]`

Detect circular dependencies in a dependency graph.

**Parameters:**
- `graph`: Dependency graph

**Returns:** `Cycle[]` - Array of detected cycles

**Example:**
```typescript
const cycles = depResolver.detectCycles(graph);

if (cycles.length > 0) {
  console.error('Circular dependencies detected:');
  cycles.forEach(cycle => {
    console.error(`  ${cycle.description}`);
  });
}
```

---

## Types

### Agent & Tool Definitions

#### `AgentDefinition`

```typescript
interface AgentDefinition {
  name: string;
  version: string;
  description: string;
  type: 'agent';

  // Model configuration
  model?: {
    provider: string;
    name: string;
  };

  // Tools this agent can use
  tools?: string[];

  // Custom tool definitions
  custom_tools?: ToolDefinition[];

  // System prompt
  prompt?: string;

  // Configuration
  config?: Record<string, any>;

  // Inheritance
  extends?: string;

  // Fork metadata
  fork_of?: {
    name: string;
    version: string;
    forked_at: string;
    merged_at?: string;
  };

  // Tags for categorization
  tags?: string[];
}
```

#### `ToolDefinition`

```typescript
interface ToolDefinition {
  name: string;
  version: string;
  description: string;
  type: 'tool';

  // Function parameters (JSON Schema)
  parameters?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };

  // Implementation details
  implementation?: {
    type: string;
    handler?: string;
    [key: string]: any;
  };

  // Dependencies on other tools
  depends_on?: string[];

  // Inheritance
  extends?: string;

  // Fork metadata
  fork_of?: {
    name: string;
    version: string;
    forked_at: string;
    merged_at?: string;
  };

  // Tags
  tags?: string[];
}
```

### Resolution Types

#### `ResolvedAgent`

```typescript
interface ResolvedAgent {
  definition: AgentDefinition;
  source: 'local' | 'global' | 'stockyard';
  version: string;
  path: string;
}
```

#### `ResolvedTool`

```typescript
interface ResolvedTool {
  definition: ToolDefinition;
  source: 'local' | 'global' | 'stockyard';
  version: string;
  path: string;
}
```

### Lockfile Types

#### `Lockfile`

```typescript
interface Lockfile {
  version: number;                // Lockfile format version
  generated: string;              // ISO timestamp
  agents: Record<string, LockfileEntry>;
  tools: Record<string, LockfileEntry>;
}
```

#### `LockfileEntry`

```typescript
interface LockfileEntry {
  version: string;                // Exact version (not a range)
  resolved: 'local' | 'global' | 'stockyard';
  integrity: string;              // SHA-256 hash
  dependencies?: LockfileDependencies;
}
```

### Update Types

#### `UpdateCheckResult`

```typescript
interface UpdateCheckResult {
  hasUpdates: boolean;
  updates: UpdateInfo[];
  breakingChanges: UpdateInfo[];
  total: number;
}
```

#### `UpdateInfo`

```typescript
interface UpdateInfo {
  name: string;
  type: 'agent' | 'tool';
  currentVersion: string;
  latestVersion: string;
  isBreaking: boolean;
  changelog?: string;
  deprecationWarning?: string;
}
```

#### `UpdateResult`

```typescript
interface UpdateResult {
  success: boolean;
  updated: UpdatedPackage[];
  failed: FailedUpdate[];
  skipped: SkippedUpdate[];
}
```

### Fork Types

#### `MergeResult`

```typescript
interface MergeResult {
  success: boolean;
  conflicts: MergeConflict[];
  merged: any;                    // Merged definition
}
```

#### `MergeConflict`

```typescript
interface MergeConflict {
  path: string;                   // JSON path to conflict
  base: any;
  local: any;
  upstream: any;
  resolved?: any;
}
```

---

## Schemas

All definitions are validated using Zod schemas:

### Agent Schema

```typescript
import { z } from 'zod';

const AgentSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  type: z.literal('agent'),
  model: z.object({
    provider: z.string(),
    name: z.string(),
  }).optional(),
  tools: z.array(z.string()).optional(),
  custom_tools: z.array(z.any()).optional(),
  prompt: z.string().optional(),
  config: z.record(z.any()).optional(),
  extends: z.string().optional(),
  fork_of: z.object({
    name: z.string(),
    version: z.string(),
    forked_at: z.string(),
    merged_at: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});
```

### Tool Schema

```typescript
const ToolSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  type: z.literal('tool'),
  parameters: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional(),
  }).optional(),
  implementation: z.object({
    type: z.string(),
    handler: z.string().optional(),
  }).passthrough().optional(),
  depends_on: z.array(z.string()).optional(),
  extends: z.string().optional(),
  fork_of: z.object({
    name: z.string(),
    version: z.string(),
    forked_at: z.string(),
    merged_at: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});
```

---

## Error Handling

### ForgeError

Base error class for all Forge errors.

```typescript
class ForgeError extends Error {
  constructor(
    public code: DefinitionErrorCode,
    message: string,
    public context?: Record<string, unknown>
  );
}
```

### Error Codes

```typescript
enum DefinitionErrorCode {
  // Definition errors
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  AGENT_INVALID = 'AGENT_INVALID',
  TOOL_INVALID = 'TOOL_INVALID',
  DEFINITION_NOT_FOUND = 'DEFINITION_NOT_FOUND',
  VERSION_NOT_FOUND = 'VERSION_NOT_FOUND',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',

  // Dependency errors
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  DEPENDENCY_NOT_FOUND = 'DEPENDENCY_NOT_FOUND',

  // Lockfile errors
  LOCKFILE_INVALID = 'LOCKFILE_INVALID',
  INTEGRITY_MISMATCH = 'INTEGRITY_MISMATCH',

  // Inheritance errors
  INHERITANCE_CYCLE = 'INHERITANCE_CYCLE',
  EXTENDS_NOT_FOUND = 'EXTENDS_NOT_FOUND',

  // Fork errors
  MERGE_CONFLICT = 'MERGE_CONFLICT',
  NOT_A_FORK = 'NOT_A_FORK',

  // Stockyard errors
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  STOCKYARD_ERROR = 'STOCKYARD_ERROR',
}
```

### Error Handling Example

```typescript
import { ForgeError, DefinitionErrorCode } from '@fractary/forge';

try {
  const resolved = await resolver.resolveAgent('missing-agent');
} catch (error) {
  if (error instanceof ForgeError) {
    switch (error.code) {
      case DefinitionErrorCode.AGENT_NOT_FOUND:
        console.error(`Agent not found: ${error.context?.name}`);
        console.error('Try installing it first or check the name.');
        break;

      case DefinitionErrorCode.CIRCULAR_DEPENDENCY:
        console.error('Circular dependency detected:');
        console.error(error.context?.chain);
        break;

      default:
        console.error(`Forge error: ${error.message}`);
    }
  } else {
    throw error; // Unexpected error
  }
}
```

---

## Advanced Usage

### Custom Resolver Integration

```typescript
import { DefinitionResolver } from '@fractary/forge';

// Extend with custom resolver logic
class CustomResolver extends DefinitionResolver {
  async resolveAgent(name: string) {
    // Custom pre-resolution logic
    console.log(`Resolving: ${name}`);

    // Call parent resolver
    const resolved = await super.resolveAgent(name);

    // Custom post-resolution logic
    console.log(`Resolved from: ${resolved.source}`);

    return resolved;
  }
}
```

### Batch Operations

```typescript
// Resolve multiple agents in parallel
const agentNames = ['agent-1', 'agent-2', 'agent-3'];
const resolved = await Promise.all(
  agentNames.map(name => resolver.resolveAgent(name))
);

console.log(`Resolved ${resolved.length} agents`);
```

### Cache Management

```typescript
// Clear resolver cache
resolver.clearCache();

// Get cache statistics
const stats = resolver.getCacheStats();
console.log(`Cache hits: ${stats.hits}`);
console.log(`Cache misses: ${stats.misses}`);
```

---

For more examples, see the [User Guide](./GUIDE.md).
