# @fractary/forge Architecture

> **System Architecture and Design Documentation**

This document describes the architecture, design principles, and implementation details of the `@fractary/forge` SDK.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Design Principles](#design-principles)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Resolution System](#resolution-system)
6. [Dependency Management](#dependency-management)
7. [Fork & Merge System](#fork--merge-system)
8. [Update Management](#update-management)
9. [Security & Integrity](#security--integrity)
10. [Performance Considerations](#performance-considerations)
11. [Extensibility](#extensibility)

---

## System Overview

### Purpose

The `@fractary/forge` SDK provides a comprehensive system for managing, resolving, and distributing AI agent and tool definitions across local, global, and remote registries.

### Key Features

- **3-Tier Resolution**: Local → Global → Stockyard (remote)
- **Dependency Management**: Automatic dependency tree resolution with cycle detection
- **Lockfile System**: Deterministic versioning with SHA-256 integrity hashing
- **Fork Workflows**: Three-way merge for customization and upstream tracking
- **Update Management**: Semver-based update detection with breaking change warnings
- **Inheritance**: Agent/tool definition inheritance with `extends` keyword

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                           │
│  (CLI tools, Web apps, Agent platforms, etc.)               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                @fractary/forge SDK                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Definition  │  │   Lockfile   │  │    Update    │     │
│  │   Resolver   │  │   Manager    │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     Fork     │  │  Dependency  │  │  Manifest    │     │
│  │   Manager    │  │   Resolver   │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬───────────┐
        ▼               ▼               ▼           ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐ ┌────────┐
│    Local     │ │  Global  │ │  Stockyard   │ │  YAML  │
│   Registry   │ │ Registry │ │   (Remote)   │ │ Loader │
└──────────────┘ └──────────┘ └──────────────┘ └────────┘
```

---

## Design Principles

### 1. Separation of Concerns

Each component has a single, well-defined responsibility:

- **DefinitionResolver**: Resolves agents/tools from registries
- **LockfileManager**: Manages lockfile generation and validation
- **DependencyResolver**: Builds dependency trees
- **ForkManager**: Handles forking and merging
- **UpdateManager**: Manages package updates

### 2. Composition Over Inheritance

Components are composed together rather than using deep inheritance hierarchies:

```typescript
// UpdateManager composes multiple dependencies
class UpdateManager {
  constructor(
    private resolver: DefinitionResolver,
    private lockfileManager: LockfileManager,
    private manifestManager: ManifestManager,
    private updateChecker: UpdateChecker
  ) {}
}
```

### 3. Type Safety

Full TypeScript support with comprehensive type definitions:

- Zod schemas for runtime validation
- TypeScript interfaces for compile-time safety
- Generic types for flexibility

### 4. Immutability

Data structures are treated as immutable where possible:

- Lockfiles are read-only once generated
- Definitions are not modified in-place
- Merge operations create new objects

### 5. Fail-Fast

Errors are detected and reported early:

- Schema validation on load
- Integrity checks before use
- Dependency cycle detection
- Version constraint validation

### 6. Extensibility

Plugin-based architecture for customization:

- Custom resolvers
- Custom validators
- Custom merge strategies
- Custom integrity algorithms

---

## Component Architecture

### DefinitionResolver

**Purpose**: Resolves agent and tool definitions from multiple registries

**Key Methods**:
- `resolveAgent(nameWithVersion: string): Promise<ResolvedAgent>`
- `resolveTool(nameWithVersion: string): Promise<ResolvedTool>`

**Resolution Flow**:
```
1. Parse name and version constraint
2. Try local registries (in order of priority)
3. Try global registry
4. Try Stockyard (remote)
5. Return first match or throw error
```

**Implementation Details**:
```typescript
class DefinitionResolver {
  private config: ResolverConfig;
  private yamlLoader: YAMLLoader;

  async resolveAgent(nameWithVersion: string): Promise<ResolvedAgent> {
    const { name, versionConstraint } = this.parseNameVersion(nameWithVersion);

    // Try local registries
    if (this.config.local.enabled) {
      for (const path of this.config.local.paths) {
        const result = await this.tryResolveFromPath(path, name, versionConstraint, 'agent');
        if (result) return { ...result, source: 'local' };
      }
    }

    // Try global registry
    if (this.config.global.enabled) {
      const result = await this.tryResolveFromPath(
        this.config.global.path,
        name,
        versionConstraint,
        'agent'
      );
      if (result) return { ...result, source: 'global' };
    }

    // Try Stockyard
    if (this.config.stockyard.enabled) {
      const result = await this.resolveFromStockyard(name, versionConstraint, 'agent');
      if (result) return { ...result, source: 'stockyard' };
    }

    throw new ResolutionError('AGENT_NOT_FOUND', `Agent not found: ${name}`);
  }
}
```

### LockfileManager

**Purpose**: Generates and validates lockfiles with integrity hashing

**Key Methods**:
- `generate(options?: GenerateOptions): Promise<Lockfile>`
- `load(path?: string): Promise<Lockfile>`
- `validate(lockfile?: Lockfile): Promise<ValidationResult>`

**Generation Algorithm**:
```
1. Discover all agents/tools in local registry
2. For each definition:
   a. Resolve with dependencies
   b. Calculate SHA-256 integrity hash
   c. Record version, source, and integrity
3. Write lockfile atomically
```

**Integrity Calculation**:
```typescript
async function calculateIntegrity(definition: AgentDefinition | ToolDefinition): Promise<string> {
  // Canonicalize JSON (sorted keys, consistent formatting)
  const canonical = canonicalize(definition);

  // Calculate SHA-256 hash
  const hash = crypto.createHash('sha256');
  hash.update(canonical);

  return `sha256-${hash.digest('hex')}`;
}
```

### DependencyResolver

**Purpose**: Builds dependency trees and detects circular dependencies

**Key Methods**:
- `buildDependencyTree(name: string, type: 'agent' | 'tool'): Promise<DependencyTree>`
- `resolveWithDependencies(name: string, type: 'agent' | 'tool'): Promise<ResolvedWithDeps>`

**Tree Building Algorithm**:
```
1. Start with root node (agent or tool)
2. For each dependency:
   a. Resolve the dependency
   b. Check for circular reference (DFS)
   c. Recursively build subtree
   d. Add to dependency graph
3. Perform topological sort (Kahn's algorithm)
4. Return ordered dependency tree
```

**Cycle Detection**:
```typescript
class DependencyResolver {
  private detectCycle(
    node: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    graph: Map<string, string[]>
  ): string[] | null {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = this.detectCycle(neighbor, visited, recursionStack, graph);
        if (cycle) return [node, ...cycle];
      } else if (recursionStack.has(neighbor)) {
        return [node, neighbor]; // Cycle found
      }
    }

    recursionStack.delete(node);
    return null;
  }
}
```

### ForkManager

**Purpose**: Manages forking and upstream merging with conflict detection

**Key Methods**:
- `forkAgent(options: ForkOptions): Promise<void>`
- `mergeUpstreamAgent(name: string, options?: MergeOptions): Promise<MergeResult>`
- `checkAgentUpstreamUpdates(name: string): Promise<UpstreamCheckResult>`

**Three-Way Merge Algorithm**:
```
For each path in the merged object tree:
  1. Get values: base, local, upstream
  2. Check if local changed from base
  3. Check if upstream changed from base
  4. Apply merge rules:
     a. If only local changed → use local
     b. If only upstream changed → use upstream
     c. If both unchanged → use base
     d. If both changed to same value → use value
     e. If both changed to different values → CONFLICT
```

**Conflict Resolution Strategies**:
- `auto`: Automatic when no conflicts
- `local`: Always prefer local changes
- `upstream`: Always prefer upstream changes
- `manual`: User must resolve manually

### UpdateManager

**Purpose**: Detects and applies package updates with rollback support

**Key Methods**:
- `update(options?: UpdateOptions): Promise<UpdateResult>`
- `updatePackage(name: string, options?: UpdateOptions): Promise<UpdateResult>`
- `rollback(name: string, version: string): Promise<void>`

**Update Detection**:
```
1. Load lockfile
2. For each locked package:
   a. Check manifest for latest version
   b. Compare with locked version (semver)
   c. Detect breaking changes (major version bump)
   d. Record update info
3. Return update summary
```

**Breaking Change Detection**:
```typescript
function isBreakingChange(current: string, latest: string): boolean {
  const currentMajor = semver.major(current);
  const latestMajor = semver.major(latest);
  return latestMajor > currentMajor;
}
```

### ManifestManager

**Purpose**: Manages package metadata and version information

**Key Methods**:
- `getManifest(name: string, type: 'agent' | 'tool'): Promise<PackageManifest | null>`
- `saveManifest(manifest: PackageManifest): Promise<void>`
- `updateManifest(name: string, updates: Partial<PackageManifest>): Promise<void>`

**Manifest Structure**:
```typescript
interface PackageManifest {
  name: string;
  type: 'agent' | 'tool';
  description: string;
  versions: string[];
  latest: string;
  installed_versions: string[];
  active_version?: string;
  last_checked: string;
  update_available: boolean;
  fork_of?: ForkMetadata;
}
```

---

## Data Flow

### Resolution Flow

```
User Request
     │
     ▼
DefinitionResolver.resolveAgent('my-agent@^1.0.0')
     │
     ├──▶ Parse name and version constraint
     │
     ├──▶ Try Local Registry
     │    └──▶ YAML Loader → Schema Validation → Inheritance Resolution
     │
     ├──▶ Try Global Registry (if not found in local)
     │    └──▶ YAML Loader → Schema Validation → Inheritance Resolution
     │
     ├──▶ Try Stockyard (if not found in global)
     │    └──▶ HTTP Client → Download → Cache → Schema Validation
     │
     └──▶ Return ResolvedAgent or throw ResolutionError
```

### Lockfile Generation Flow

```
User Request
     │
     ▼
LockfileManager.generate()
     │
     ├──▶ Discover all local agents/tools
     │    └──▶ Scan .fractary/agents/ and .fractary/tools/
     │
     ├──▶ For each discovered definition:
     │    │
     │    ├──▶ DefinitionResolver.resolveAgent(name)
     │    │
     │    ├──▶ DependencyResolver.buildDependencyTree(name)
     │    │    └──▶ Resolve all transitive dependencies
     │    │
     │    └──▶ calculateIntegrity(definition)
     │         └──▶ Canonicalize JSON → SHA-256 hash
     │
     ├──▶ Build lockfile object
     │    └──▶ { version, generated, agents: {...}, tools: {...} }
     │
     └──▶ Write to .fractary/forge.lock atomically
```

### Update Flow

```
User Request
     │
     ▼
UpdateManager.update()
     │
     ├──▶ UpdateChecker.checkUpdates()
     │    │
     │    ├──▶ Load lockfile
     │    │
     │    ├──▶ For each locked package:
     │    │    ├──▶ ManifestManager.getManifest(name)
     │    │    ├──▶ Compare locked version vs latest
     │    │    └──▶ Detect breaking changes (semver major)
     │    │
     │    └──▶ Return UpdateCheckResult
     │
     ├──▶ Filter updates (skipBreaking, packages, etc.)
     │
     ├──▶ For each update:
     │    │
     │    ├──▶ DefinitionResolver.resolve(name@latestVersion)
     │    │
     │    ├──▶ calculateIntegrity(newDefinition)
     │    │
     │    └──▶ Update lockfile entry
     │
     ├──▶ Save updated lockfile
     │
     └──▶ Return UpdateResult
```

### Fork & Merge Flow

```
User Request
     │
     ▼
ForkManager.forkAgent(options)
     │
     ├──▶ Resolve source agent
     │
     ├──▶ Create forked definition
     │    ├──▶ Copy source definition
     │    ├──▶ Apply customizations
     │    └──▶ Add fork_of metadata
     │
     ├──▶ Save to local registry
     │
     └──▶ Create manifest entry
          └──▶ Track fork metadata

Later: Check for updates
     │
     ▼
ForkManager.checkAgentUpstreamUpdates(name)
     │
     ├──▶ Load forked agent
     │
     ├──▶ Resolve upstream agent
     │
     ├──▶ Compare versions
     │
     └──▶ Return UpstreamCheckResult

Later: Merge updates
     │
     ▼
ForkManager.mergeUpstreamAgent(name, options)
     │
     ├──▶ Load fork metadata (base version)
     │
     ├──▶ Resolve three versions:
     │    ├──▶ base (original forked version)
     │    ├──▶ local (current fork)
     │    └──▶ upstream (latest upstream version)
     │
     ├──▶ performMerge({ base, local, upstream })
     │    │
     │    ├──▶ For each path in object tree:
     │    │    ├──▶ Detect changes (local vs base, upstream vs base)
     │    │    └──▶ Apply merge rules
     │    │
     │    └──▶ Return MergeResult (success or conflicts)
     │
     ├──▶ If conflicts and strategy set:
     │    └──▶ Auto-resolve using strategy
     │
     ├──▶ Save merged definition
     │
     └──▶ Update fork metadata
```

---

## Resolution System

### 3-Tier Resolution

The resolution system follows a priority-based approach:

1. **Local Registry** (highest priority)
   - Location: `.fractary/agents/`, `.fractary/tools/`
   - Purpose: Project-specific customizations
   - Behavior: First checked, highest priority

2. **Global Registry**
   - Location: `~/.fractary/registry/`
   - Purpose: System-wide shared definitions
   - Behavior: Checked if not found in local

3. **Stockyard** (lowest priority)
   - Location: Remote marketplace API
   - Purpose: Public registry for discovery
   - Behavior: Checked if not found in global

### Version Matching

Version constraints follow npm semver conventions:

```typescript
// Semver version matching examples
'1.2.3'   → Exact version 1.2.3
'^1.2.3'  → >= 1.2.3, < 2.0.0 (compatible)
'~1.2.3'  → >= 1.2.3, < 1.3.0 (patch updates)
'*'       → Any version (latest)
'latest'  → Latest stable version
```

**Matching Algorithm**:
```typescript
function matchVersion(constraint: string, availableVersions: string[]): string | null {
  // Sort versions in descending order
  const sorted = semver.rsort(availableVersions);

  // Find first matching version
  for (const version of sorted) {
    if (semver.satisfies(version, constraint)) {
      return version;
    }
  }

  return null; // No matching version
}
```

### Inheritance Resolution

Agents and tools can extend base definitions:

```yaml
name: specialized-agent
extends: base-agent  # Inheritance
```

**Inheritance Algorithm**:
```
1. Load child definition
2. If child has 'extends':
   a. Recursively resolve parent definition
   b. Merge parent into child:
      - Scalar values: child overrides parent
      - Arrays: union of both (deduplicated)
      - Objects: deep merge (child takes precedence)
3. Return fully resolved definition
```

**Deep Merge Rules**:
```typescript
function deepMerge(base: any, override: any): any {
  if (Array.isArray(base) && Array.isArray(override)) {
    // Union and deduplicate
    return Array.from(new Set([...base, ...override]));
  }

  if (isObject(base) && isObject(override)) {
    // Deep merge objects
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
      result[key] = key in base ? deepMerge(base[key], value) : value;
    }
    return result;
  }

  // Scalars: override wins
  return override;
}
```

---

## Dependency Management

### Dependency Graph

Dependencies form a directed acyclic graph (DAG):

```
Agent A
  ├─▶ Tool 1
  │    └─▶ Tool 3
  ├─▶ Tool 2
  │    └─▶ Tool 3  (shared dependency)
  └─▶ Tool 4

Resolved order (topological sort):
  Tool 3 → Tool 1 → Tool 2 → Tool 4 → Agent A
```

### Cycle Detection

Circular dependencies are detected using depth-first search (DFS):

```typescript
function detectCycles(graph: DependencyGraph): string[] | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  for (const node of graph.nodes.keys()) {
    if (!visited.has(node)) {
      const cycle = dfs(node, visited, recursionStack, graph);
      if (cycle) return cycle;
    }
  }

  return null; // No cycles
}

function dfs(
  node: string,
  visited: Set<string>,
  stack: Set<string>,
  graph: DependencyGraph
): string[] | null {
  visited.add(node);
  stack.add(node);

  const deps = graph.nodes.get(node)?.dependencies || [];
  for (const dep of deps) {
    if (!visited.has(dep)) {
      const cycle = dfs(dep, visited, stack, graph);
      if (cycle) return [node, ...cycle];
    } else if (stack.has(dep)) {
      return [node, dep]; // Cycle detected
    }
  }

  stack.delete(node);
  return null;
}
```

### Topological Sort

Dependencies are sorted to ensure correct load order:

```typescript
function topologicalSort(graph: DependencyGraph): string[] {
  const inDegree = new Map<string, number>();
  const result: string[] = [];
  const queue: string[] = [];

  // Calculate in-degrees
  for (const node of graph.nodes.keys()) {
    inDegree.set(node, 0);
  }

  for (const [node, data] of graph.nodes) {
    for (const dep of data.dependencies) {
      inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
    }
  }

  // Find nodes with no dependencies
  for (const [node, degree] of inDegree) {
    if (degree === 0) queue.push(node);
  }

  // Kahn's algorithm
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    const deps = graph.nodes.get(node)?.dependencies || [];
    for (const dep of deps) {
      const newDegree = inDegree.get(dep)! - 1;
      inDegree.set(dep, newDegree);

      if (newDegree === 0) {
        queue.push(dep);
      }
    }
  }

  if (result.length !== graph.nodes.size) {
    throw new Error('Circular dependency detected');
  }

  return result.reverse(); // Dependencies first
}
```

---

## Fork & Merge System

### Three-Way Merge

The fork system uses a three-way merge algorithm:

- **Base**: Original version at fork time
- **Local**: Current fork with customizations
- **Upstream**: Latest upstream version

**Merge Decision Matrix**:

| Local Changed | Upstream Changed | Result |
|---------------|------------------|---------|
| No | No | Use base value |
| Yes | No | Use local value |
| No | Yes | Use upstream value |
| Yes (same) | Yes (same) | Use value |
| Yes (diff) | Yes (diff) | **CONFLICT** |

### Conflict Detection

Conflicts are detected at the path level:

```typescript
interface MergeConflict {
  path: string;        // JSON path (e.g., 'config.temperature')
  base: any;           // Value in base version
  local: any;          // Value in local fork
  upstream: any;       // Value in upstream
  resolved?: any;      // Resolved value (if resolved)
}
```

**Path Calculation**:
```typescript
function getAllPaths(obj: any, prefix = ''): string[] {
  const paths: string[] = [];

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const path = `${prefix}[${index}]`;
      paths.push(path);
      paths.push(...getAllPaths(item, path));
    });
  } else if (isObject(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      paths.push(...getAllPaths(value, path));
    }
  }

  return paths;
}
```

### Conflict Resolution

Four resolution strategies:

1. **auto**: Automatic when no conflicts
   - Only succeeds if all paths can be auto-merged
   - Fails and returns conflicts if any conflict detected

2. **local**: Always prefer local changes
   - For conflicts: use local value
   - For upstream-only changes: use upstream value
   - For local-only changes: use local value

3. **upstream**: Always prefer upstream changes
   - For conflicts: use upstream value
   - For local-only changes: use local value
   - For upstream-only changes: use upstream value

4. **manual**: User must resolve
   - Returns conflicts for manual editing
   - User edits YAML file directly
   - No automatic resolution

---

## Update Management

### Update Detection

Updates are detected by comparing lockfile versions with manifest versions:

```typescript
interface UpdateInfo {
  name: string;
  type: 'agent' | 'tool';
  currentVersion: string;
  latestVersion: string;
  isBreaking: boolean;
}
```

**Detection Algorithm**:
```
1. Load lockfile
2. For each entry:
   a. Get manifest for package
   b. Compare lockfile version vs manifest latest
   c. If versions differ:
      - Check if breaking (major version change)
      - Add to updates list
3. Return update summary
```

### Breaking Change Detection

Breaking changes are detected using semver:

```typescript
function isBreakingChange(current: string, latest: string): boolean {
  return semver.major(latest) > semver.major(current);
}

// Examples:
isBreakingChange('1.5.2', '2.0.0') // true  - major bump
isBreakingChange('1.5.2', '1.6.0') // false - minor bump
isBreakingChange('1.5.2', '1.5.3') // false - patch bump
```

### Update Strategies

Three update strategies:

1. **latest**: Update to latest version (including major)
2. **minor**: Update within current major version
3. **patch**: Update within current minor version

```typescript
function getUpdateVersion(current: string, latest: string, strategy: 'latest' | 'minor' | 'patch'): string {
  switch (strategy) {
    case 'latest':
      return latest;

    case 'minor':
      // Update to latest minor within current major
      const currentMajor = semver.major(current);
      const latestMajor = semver.major(latest);
      return latestMajor > currentMajor ? current : latest;

    case 'patch':
      // Update to latest patch within current minor
      const currentMinor = `${semver.major(current)}.${semver.minor(current)}`;
      const latestMinor = `${semver.major(latest)}.${semver.minor(latest)}`;
      return latestMinor !== currentMinor ? current : latest;
  }
}
```

---

## Security & Integrity

### Integrity Hashing

All definitions are integrity-checked using SHA-256:

**Hash Calculation**:
```typescript
function calculateIntegrity(definition: any): string {
  // 1. Canonicalize JSON (sorted keys, no whitespace)
  const canonical = JSON.stringify(definition, Object.keys(definition).sort());

  // 2. Calculate SHA-256 hash
  const hash = crypto.createHash('sha256');
  hash.update(canonical, 'utf8');

  // 3. Return hash with algorithm prefix
  return `sha256-${hash.digest('hex')}`;
}
```

**Verification**:
```typescript
async function verifyIntegrity(definition: any, expected: string): Promise<boolean> {
  const actual = await calculateIntegrity(definition);
  return actual === expected;
}
```

### Schema Validation

All definitions are validated against Zod schemas:

```typescript
const AgentDefinitionSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  type: z.literal('agent'),
  description: z.string().optional(),
  model: z.object({
    provider: z.string(),
    name: z.string(),
  }),
  tools: z.array(z.string()).optional(),
  prompt: z.string().optional(),
  config: z.record(z.any()).optional(),
  extends: z.string().optional(),
  fork_of: z.object({
    name: z.string(),
    version: z.string(),
    forked_at: z.string(),
  }).optional(),
});
```

**Validation Flow**:
```
YAML File → YAML Parser → JSON Object → Zod Schema → Validated Definition
                                             ↓
                                        (if invalid)
                                             ↓
                                      ValidationError
```

### Tamper Detection

Lockfile integrity ensures tamper detection:

```
1. Generate lockfile with integrity hashes
2. Commit lockfile to version control
3. On install/update:
   a. Load lockfile
   b. Resolve each package
   c. Recalculate integrity
   d. Compare with lockfile integrity
   e. If mismatch → Integrity Error
```

---

## Performance Considerations

### Caching

The SDK implements several caching strategies:

**1. Resolution Cache**
```typescript
class DefinitionResolver {
  private cache = new Map<string, ResolvedAgent | ResolvedTool>();

  async resolveAgent(nameWithVersion: string): Promise<ResolvedAgent> {
    // Check cache first
    const cached = this.cache.get(nameWithVersion);
    if (cached) return cached as ResolvedAgent;

    // Resolve and cache
    const resolved = await this.doResolve(nameWithVersion);
    this.cache.set(nameWithVersion, resolved);
    return resolved;
  }
}
```

**2. Manifest Cache**
```typescript
class ManifestManager {
  private manifestCache = new Map<string, PackageManifest>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  async getManifest(name: string): Promise<PackageManifest | null> {
    const cached = this.manifestCache.get(name);
    if (cached && !this.isExpired(cached)) {
      return cached;
    }

    const manifest = await this.loadManifest(name);
    this.manifestCache.set(name, manifest);
    return manifest;
  }
}
```

**3. Stockyard Cache** (future)
```typescript
class StockyardClient {
  private httpCache = new LRUCache({
    max: 100,           // Max 100 cached responses
    ttl: 3600 * 1000,  // 1 hour TTL
  });
}
```

### Lazy Loading

Definitions are loaded on-demand:

```typescript
// ❌ Eager loading (inefficient)
const allAgents = await loadAllAgents();
const myAgent = allAgents.find(a => a.name === 'my-agent');

// ✅ Lazy loading (efficient)
const myAgent = await resolver.resolveAgent('my-agent');
```

### Parallel Resolution

Dependencies can be resolved in parallel:

```typescript
async function resolveMultiple(names: string[]): Promise<ResolvedAgent[]> {
  // Resolve all in parallel
  return Promise.all(names.map(name => resolver.resolveAgent(name)));
}
```

### Incremental Updates

Lockfile updates are incremental:

```typescript
// Only regenerate changed entries
async function incrementalUpdate(packageName: string) {
  const lockfile = await lockfileManager.load();

  // Only update this package
  const resolved = await resolver.resolveAgent(packageName);
  const integrity = await calculateIntegrity(resolved.definition);

  lockfile.agents[packageName] = {
    version: resolved.version,
    resolved: resolved.source,
    integrity,
  };

  await lockfileManager.save(lockfile);
}
```

---

## Extensibility

### Custom Resolvers

Extend `DefinitionResolver` for custom resolution logic:

```typescript
class DatabaseResolver extends DefinitionResolver {
  constructor(
    config: ResolverConfig,
    private db: Database
  ) {
    super(config);
  }

  async resolveAgent(nameWithVersion: string): Promise<ResolvedAgent> {
    // Try database first
    const fromDb = await this.resolveFromDatabase(nameWithVersion);
    if (fromDb) return fromDb;

    // Fall back to default resolution
    return super.resolveAgent(nameWithVersion);
  }

  private async resolveFromDatabase(nameWithVersion: string): Promise<ResolvedAgent | null> {
    const { name, versionConstraint } = this.parseNameVersion(nameWithVersion);

    const definition = await this.db.query(
      'SELECT * FROM agents WHERE name = ? AND version = ?',
      [name, versionConstraint]
    );

    if (!definition) return null;

    return {
      definition,
      version: definition.version,
      source: 'database' as any,
      path: '',
    };
  }
}
```

### Custom Merge Strategies

Implement custom conflict resolution:

```typescript
interface MergeStrategy {
  resolve(conflict: MergeConflict): any;
}

class TimestampMergeStrategy implements MergeStrategy {
  resolve(conflict: MergeConflict): any {
    // Always prefer newer value based on metadata timestamp
    const localTime = conflict.local?.updated_at || 0;
    const upstreamTime = conflict.upstream?.updated_at || 0;

    return localTime > upstreamTime ? conflict.local : conflict.upstream;
  }
}

// Use custom strategy
const forkManager = new ForkManager(resolver, manifestManager);
forkManager.setMergeStrategy(new TimestampMergeStrategy());
```

### Custom Validators

Add custom validation logic:

```typescript
interface Validator {
  validate(definition: AgentDefinition | ToolDefinition): ValidationResult;
}

class BusinessRulesValidator implements Validator {
  validate(definition: AgentDefinition): ValidationResult {
    const errors: string[] = [];

    // Custom validation: agents must use approved models
    const approvedModels = ['claude-sonnet-4', 'claude-opus-4'];
    if (!approvedModels.includes(definition.model.name)) {
      errors.push(`Model ${definition.model.name} is not approved`);
    }

    // Custom validation: agents must have at least one tool
    if (!definition.tools || definition.tools.length === 0) {
      errors.push('Agents must have at least one tool');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Use custom validator
const validator = new BusinessRulesValidator();
const result = validator.validate(agentDefinition);
```

### Plugin System (Future)

Future plugin architecture:

```typescript
interface ForgePlugin {
  name: string;
  version: string;
  onResolve?(resolved: ResolvedAgent | ResolvedTool): void;
  onLockfileGenerate?(lockfile: Lockfile): void;
  onUpdate?(result: UpdateResult): void;
}

class PluginManager {
  private plugins: ForgePlugin[] = [];

  register(plugin: ForgePlugin): void {
    this.plugins.push(plugin);
  }

  async executeHook(hook: keyof ForgePlugin, ...args: any[]): Promise<void> {
    for (const plugin of this.plugins) {
      const fn = plugin[hook];
      if (typeof fn === 'function') {
        await fn.apply(plugin, args);
      }
    }
  }
}

// Usage
const pluginManager = new PluginManager();
pluginManager.register(new TelemetryPlugin());
pluginManager.register(new AuditLogPlugin());
```

---

## Conclusion

The `@fractary/forge` SDK provides a robust, extensible architecture for managing AI agent and tool definitions. Key architectural principles include:

- **Separation of Concerns**: Each component has a single responsibility
- **Type Safety**: Full TypeScript support with runtime validation
- **Security**: SHA-256 integrity hashing and schema validation
- **Performance**: Caching, lazy loading, and parallel resolution
- **Extensibility**: Plugin architecture and custom implementations

For implementation details, see the [API Reference](./API.md) and [User Guide](./GUIDE.md).
