# SPEC-FORGE-002: Agent Registry & Resolution

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Created** | 2025-12-14 |
| **Updated** | 2025-12-14 |
| **Author** | Claude (with human direction) |
| **Project** | `@fractary/forge` |
| **Related** | SPEC-FORGE-001, SPEC-FABER-002, SPEC-MIGRATION-001 |
| **Phase** | Phase 1: Foundation |

## 1. Executive Summary

This specification defines the **Agent & Tool Registry and Resolution System** for `@fractary/forge`, establishing how agents and tools are discovered, cached, versioned, and resolved from multiple sources (local, global, Stockyard).

### 1.1 Scope

This document covers:
- Multi-source registry architecture (local → global → Stockyard)
- Resolution algorithm and priority rules
- Version management and constraints
- Caching strategy and cache invalidation
- Forking and customization workflows
- Update notifications and version tracking
- Package metadata and manifests
- Dependency resolution (agents that reference other agents/tools)

### 1.2 Design Goals

1. **Hierarchical Resolution** - Local overrides global overrides Stockyard
2. **Fast Lookups** - In-memory cache, filesystem cache, network fallback
3. **Version Aware** - Support semantic versioning and constraints
4. **Fork Friendly** - Easy to fork and customize while tracking upstream
5. **Update Safe** - Notify about updates, opt-in to upgrade
6. **Offline Capable** - Works without network after initial download
7. **Dependency Tracking** - Resolve transitive dependencies automatically
8. **Fail Fast** - Clear errors with actionable messages, no silent fallbacks

## 2. Registry Architecture

### 2.1 Three-Tier Registry

```
┌─────────────────────────────────────────────────────────┐
│                   Resolution Order                      │
├─────────────────────────────────────────────────────────┤
│ 1. Project-Local Registry (.fractary/agents/)          │
│    - Highest priority                                   │
│    - Project-specific customizations                    │
│    - Not shared across projects                         │
├─────────────────────────────────────────────────────────┤
│ 2. Global Registry (~/.fractary/registry/)             │
│    - Shared across all projects                        │
│    - User-wide installations                            │
│    - Cached downloads from Stockyard                    │
├─────────────────────────────────────────────────────────┤
│ 3. Stockyard (https://stockyard.fractary.dev)          │
│    - Remote marketplace                                 │
│    - Canonical source of truth                          │
│    - Ratings, versions, premium packages                │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Registry Storage Structure

```
# Project-Local Registry
project-root/
├── .fractary/
│   ├── agents/
│   │   ├── my-custom-agent.yaml
│   │   └── frame-agent.yaml  # Customized version
│   │
│   ├── tools/
│   │   └── my-tool.yaml
│   │
│   └── plugins/
│       └── forge/
│           ├── config.json
│           └── lockfile.json  # Pinned versions

# Global Registry
~/.fractary/
├── registry/
│   ├── agents/
│   │   ├── frame-agent@2.0.0.yaml
│   │   ├── frame-agent@2.1.0.yaml
│   │   ├── architect-agent@1.5.0.yaml
│   │   └── corthion-loader@3.2.1.yaml
│   │
│   ├── tools/
│   │   ├── terraform-deploy@1.2.0.yaml
│   │   └── docker-build@2.0.0.yaml
│   │
│   └── manifests/
│       ├── frame-agent.json       # Version metadata
│       ├── architect-agent.json
│       └── corthion-loader.json
│
├── cache/
│   └── stockyard/
│       └── [cached API responses]
│
└── config/
    └── forge.json  # Global Forge configuration
```

## 3. Resolution Algorithm

### 3.1 Agent Resolution Flow

```typescript
// forge/src/definitions/registry/resolver.ts
export class AgentResolver {
  async resolve(
    name: string,
    constraint?: VersionConstraint
  ): Promise<ResolvedAgent> {
    // 1. Parse name (supports versioning)
    const parsed = this.parseName(name);
    // Examples:
    //   "frame-agent"           → { name: "frame-agent", version: "latest" }
    //   "frame-agent@2.0.0"     → { name: "frame-agent", version: "2.0.0" }
    //   "frame-agent@>=2.0.0"   → { name: "frame-agent", version: ">=2.0.0" }

    // 2. Check project-local registry first
    const local = await this.checkLocalRegistry(parsed.name);
    if (local) {
      this.logger.debug(`Resolved ${name} from project-local registry`);
      return {
        definition: local,
        source: 'local',
        version: local.version,  // Read from YAML content
      };
    }

    // 3. Check global registry
    const global = await this.checkGlobalRegistry(parsed.name, parsed.version);
    if (global) {
      this.logger.debug(`Resolved ${name} from global registry`);
      return {
        definition: global,
        source: 'global',
        version: global.version,
      };
    }

    // 4. Fetch from Stockyard
    if (this.config.stockyard.enabled) {
      this.logger.debug(`Fetching ${name} from Stockyard`);
      const stockyard = await this.fetchFromStockyard(parsed.name, parsed.version);

      if (stockyard) {
        // Cache to global registry
        await this.cacheToGlobalRegistry(stockyard);

        return {
          definition: stockyard,
          source: 'stockyard',
          version: stockyard.version,
        };
      }
    }

    // 5. Not found
    throw new AgentNotFoundError(
      `Agent '${name}' not found in any registry`
    );
  }

  private async checkLocalRegistry(name: string): Promise<AgentDefinition | null> {
    const localPath = path.join(
      process.cwd(),
      '.fractary/agents',
      `${name}.yaml`
    );

    if (await fs.pathExists(localPath)) {
      const definition = await this.loadYaml(localPath);
      // Version is read from the YAML 'version' field
      if (!definition.version) {
        throw new ValidationError(
          `Local agent '${name}' missing required 'version' field in ${localPath}`
        );
      }
      return definition;
    }

    return null;
  }

  private async checkGlobalRegistry(
    name: string,
    version: string
  ): Promise<AgentDefinition | null> {
    const registryPath = path.join(
      os.homedir(),
      '.fractary/registry/agents'
    );

    // If version specified, try exact match first
    if (version !== 'latest') {
      const exactPath = path.join(registryPath, `${name}@${version}.yaml`);
      if (await fs.pathExists(exactPath)) {
        return await this.loadYaml(exactPath);
      }
    }

    // Find all versions and pick best match
    const pattern = path.join(registryPath, `${name}@*.yaml`);
    const files = await glob(pattern);

    if (files.length === 0) return null;

    // Extract versions and find best match
    const versions = files.map(f => {
      const match = f.match(/@([\d.]+)\.yaml$/);
      return match ? match[1] : null;
    }).filter(Boolean) as string[];

    const bestVersion = this.findBestVersion(versions, version);
    if (!bestVersion) return null;

    const bestPath = path.join(registryPath, `${name}@${bestVersion}.yaml`);
    return await this.loadYaml(bestPath);
  }

  private findBestVersion(
    available: string[],
    constraint: string
  ): string | null {
    // Use semver to find best matching version
    const satisfying = available.filter(v => semver.satisfies(v, constraint));

    if (satisfying.length === 0) return null;

    // Return highest matching version
    return semver.maxSatisfying(satisfying, constraint);
  }
}
```

### 3.2 Version Constraint Syntax

```typescript
// Supported constraint formats:
"frame-agent"              // Latest version
"frame-agent@2.0.0"        // Exact version
"frame-agent@^2.0.0"       // Compatible with 2.x.x
"frame-agent@~2.0.0"       // Compatible with 2.0.x
"frame-agent@>=2.0.0"      // Greater than or equal
"frame-agent@>=2.0.0 <3.0.0"  // Range
```

### 3.3 Local Agent Versioning

Local agents MUST declare their version in the YAML definition file:

```yaml
# .fractary/agents/my-custom-agent.yaml
name: my-custom-agent
version: 1.2.0  # REQUIRED for local agents
description: Custom agent for project-specific workflow
# ... rest of definition
```

**Rationale**: Reading version from YAML content provides semantic versioning for local agents and ensures version information is self-contained within the definition file. This is consistent with how versioned packages work in other ecosystems.

**Validation**: The loader validates that local agents have a `version` field and that it follows semver format. Missing or invalid versions result in immediate validation errors.

## 4. Package Manifests

### 4.1 Manifest Format

Each agent/tool in the global registry has a manifest with metadata:

```json
// ~/.fractary/registry/manifests/frame-agent.json
{
  "name": "frame-agent",
  "type": "agent",
  "description": "FABER Frame phase agent - gathers requirements and classifies work",

  // Available versions
  "versions": [
    {
      "version": "2.1.0",
      "released": "2025-12-10T18:30:00Z",
      "status": "stable",
      "changelog_url": "https://stockyard.fractary.dev/agents/frame-agent/changelog#2.1.0"
    },
    {
      "version": "2.0.0",
      "released": "2025-11-15T10:00:00Z",
      "status": "stable"
    },
    {
      "version": "1.5.2",
      "released": "2025-10-01T14:20:00Z",
      "status": "deprecated",
      "deprecation_message": "Upgrade to 2.x for improved classification"
    }
  ],

  // Latest stable version
  "latest": "2.1.0",

  // Dependency information
  "dependencies": {
    "tools": {
      "fetch_issue": ">=1.0.0",
      "classify_work_type": "^2.0.0"
    },
    "agents": {}  // No agent dependencies
  },

  // Stockyard metadata
  "stockyard": {
    "author": "Fractary Team",
    "license": "MIT",
    "homepage": "https://stockyard.fractary.dev/agents/frame-agent",
    "repository": "https://github.com/fractary/agents/tree/main/frame-agent",
    "downloads": 15420,
    "rating": 4.8,
    "tags": ["faber", "workflow", "classification"]
  },

  // Fork tracking
  "fork_of": null,  // Not a fork
  "forks": [
    {
      "name": "acme-frame-agent",
      "author": "ACME Corp",
      "url": "https://stockyard.fractary.dev/agents/acme-frame-agent"
    }
  ],

  // Local installation metadata
  "installed_versions": ["2.0.0", "2.1.0"],
  "active_version": "2.0.0",  // What the lockfile pins
  "last_checked": "2025-12-14T10:00:00Z",
  "update_available": true
}
```

### 4.2 Manifest Syncing

```typescript
// forge/src/definitions/registry/manifest-sync.ts
export class ManifestSync {
  async syncManifests(options: { force?: boolean } = {}): Promise<void> {
    const manifestsDir = path.join(
      os.homedir(),
      '.fractary/registry/manifests'
    );

    // Load all local manifests
    const localManifests = await this.loadLocalManifests();

    for (const manifest of localManifests) {
      // Check if update needed
      const timeSinceCheck = Date.now() - new Date(manifest.last_checked).getTime();
      const ttl = this.config.manifest_ttl || 3600000; // 1 hour

      if (!options.force && timeSinceCheck < ttl) {
        continue; // Skip, recently checked
      }

      // Fetch latest metadata from Stockyard
      const latest = await this.stockyard.getAgentMetadata(manifest.name);

      // Update manifest
      manifest.versions = latest.versions;
      manifest.latest = latest.latest;
      manifest.stockyard = latest.stockyard;
      manifest.last_checked = new Date().toISOString();

      // Check if update available
      manifest.update_available = semver.gt(
        latest.latest,
        manifest.active_version
      );

      // Save updated manifest
      await this.saveManifest(manifest);

      // Notify if update available
      if (manifest.update_available) {
        this.logger.info(
          `Update available: ${manifest.name}@${manifest.active_version} → ${latest.latest}`
        );
      }
    }
  }
}
```

## 5. Lockfile

### 5.1 Lockfile Format

Project-specific lockfile pins exact versions:

```json
// .fractary/plugins/forge/lockfile.json
{
  "version": 1,
  "generated": "2025-12-14T10:30:00Z",

  "agents": {
    "frame-agent": {
      "version": "2.0.0",
      "resolved": "global",
      "integrity": "sha256-abc123...",
      "dependencies": {
        "tools": {
          "fetch_issue": "1.2.0",
          "classify_work_type": "2.1.0"
        }
      }
    },
    "architect-agent": {
      "version": "1.5.0",
      "resolved": "global",
      "integrity": "sha256-def456...",
      "dependencies": {
        "tools": {
          "create_specification": "3.0.0",
          "validate_specification": "2.5.1"
        }
      }
    },
    "my-custom-agent": {
      "version": "1.0.0",
      "resolved": "local",
      "integrity": "sha256-custom123...",
      "dependencies": {}
    }
  },

  "tools": {
    "fetch_issue": {
      "version": "1.2.0",
      "resolved": "global",
      "integrity": "sha256-tool123..."
    },
    "classify_work_type": {
      "version": "2.1.0",
      "resolved": "global",
      "integrity": "sha256-tool456..."
    }
  }
}
```

### 5.2 Lockfile Generation

```typescript
// forge/src/definitions/registry/lockfile.ts
export class LockfileManager {
  async generateLockfile(): Promise<Lockfile> {
    const lockfile: Lockfile = {
      version: 1,
      generated: new Date().toISOString(),
      agents: {},
      tools: {},
    };

    // Discover all agents used in project
    const usedAgents = await this.discoverUsedAgents();

    for (const agentName of usedAgents) {
      // Resolve agent
      const resolved = await this.resolver.resolve(agentName);

      // Add to lockfile
      lockfile.agents[agentName] = {
        version: resolved.version,
        resolved: resolved.source,
        integrity: await this.calculateIntegrity(resolved.definition),
        dependencies: await this.resolveDependencies(resolved.definition),
      };

      // Add tools to lockfile
      for (const [toolName, toolVersion] of Object.entries(
        resolved.definition.tools || {}
      )) {
        if (!lockfile.tools[toolName]) {
          const toolResolved = await this.resolver.resolveTool(
            `${toolName}@${toolVersion}`
          );

          lockfile.tools[toolName] = {
            version: toolResolved.version,
            resolved: toolResolved.source,
            integrity: await this.calculateIntegrity(toolResolved.definition),
          };
        }
      }
    }

    return lockfile;
  }

  private async discoverUsedAgents(): Promise<string[]> {
    // Scan .fractary/agents/ for local agents
    const localAgents = await this.scanLocalAgents();

    // Scan workflow files for agent references
    const workflowAgents = await this.scanWorkflows();

    return [...new Set([...localAgents, ...workflowAgents])];
  }
}
```

### 5.3 Offline Resolution with Lockfile

When resolving with a lockfile in offline mode, the system follows a strict fail-fast approach:

```typescript
// forge/src/definitions/registry/lockfile-resolver.ts
export class LockfileResolver {
  async resolveFromLockfile(
    name: string,
    lockfile: Lockfile
  ): Promise<ResolvedAgent> {
    const entry = lockfile.agents[name];
    if (!entry) {
      throw new LockfileError(
        `Agent '${name}' not found in lockfile. Run 'forge lock' to regenerate.`
      );
    }

    // Check if version is available in cache
    switch (entry.resolved) {
      case 'local':
        return this.resolveLocal(name, entry);
      case 'global':
        return this.resolveGlobal(name, entry);
      case 'stockyard':
        // Must be in global cache
        return this.resolveGlobalCached(name, entry);
    }
  }

  private async resolveGlobalCached(
    name: string,
    entry: LockfileEntry
  ): Promise<ResolvedAgent> {
    const cachedPath = path.join(
      os.homedir(),
      '.fractary/registry/agents',
      `${name}@${entry.version}.yaml`
    );

    if (!(await fs.pathExists(cachedPath))) {
      // FAIL FAST: No silent fallbacks
      throw new CacheMissError(
        `Agent '${name}@${entry.version}' not found in global cache.\n` +
        `The lockfile references this version but it is not installed locally.\n\n` +
        `To fix this, run:\n` +
        `  forge install\n\n` +
        `This will download all locked versions to your global cache.`
      );
    }

    const definition = await this.loadYaml(cachedPath);

    // Verify integrity
    const actualIntegrity = await this.calculateIntegrity(definition);
    if (actualIntegrity !== entry.integrity) {
      throw new IntegrityError(
        `Integrity mismatch for '${name}@${entry.version}'.\n` +
        `Expected: ${entry.integrity}\n` +
        `Actual: ${actualIntegrity}\n\n` +
        `The cached file may be corrupted. Run 'forge install --force' to re-download.`
      );
    }

    return {
      definition,
      source: 'global',
      version: entry.version,
    };
  }
}
```

**Rationale**: Fail-fast behavior provides clear, predictable error messages that guide users to the correct action. Silent fallbacks or degraded modes can lead to subtle bugs and inconsistent behavior across environments.

## 6. Forking & Customization

### 6.1 Fork Workflow

```bash
# Fork an agent from Stockyard
forge fork frame-agent my-frame-agent

# This creates:
# 1. .fractary/agents/my-frame-agent.yaml (customized copy)
# 2. Updates manifest to track fork relationship
# 3. Allows customization while tracking upstream updates
```

```typescript
// forge/src/definitions/commands/fork.ts
export class ForkCommand {
  async fork(sourceName: string, targetName: string): Promise<void> {
    // 1. Resolve source agent
    const source = await this.resolver.resolve(sourceName);

    // 2. Create customized copy
    const forked = {
      ...source.definition,
      name: targetName,
      fork_of: {
        name: sourceName,
        version: source.version,
        forked_at: new Date().toISOString(),
      },
    };

    // 3. Save to project-local registry
    const targetPath = path.join(
      process.cwd(),
      '.fractary/agents',
      `${targetName}.yaml`
    );

    await this.writeYaml(targetPath, forked);

    // 4. Track fork in manifest
    await this.manifestManager.trackFork(sourceName, targetName);

    this.logger.success(
      `Forked ${sourceName}@${source.version} → ${targetName}`
    );
    this.logger.info(`Edit at: ${targetPath}`);
  }

  async checkUpstreamUpdates(forkedName: string): Promise<void> {
    // Load forked agent
    const forked = await this.loader.loadLocal(forkedName);

    if (!forked.fork_of) {
      throw new Error(`${forkedName} is not a fork`);
    }

    // Check upstream for updates
    const upstream = await this.resolver.resolve(forked.fork_of.name);

    if (semver.gt(upstream.version, forked.fork_of.version)) {
      this.logger.info(
        `Upstream update available: ${forked.fork_of.version} → ${upstream.version}`
      );
      this.logger.info(`Run: forge merge-upstream ${forkedName}`);
    } else {
      this.logger.success('Fork is up to date with upstream');
    }
  }

  async mergeUpstream(forkedName: string): Promise<void> {
    // Load forked agent
    const forked = await this.loader.loadLocal(forkedName);

    // Fetch latest upstream
    const upstream = await this.resolver.resolve(forked.fork_of!.name);

    // Perform 3-way merge
    const mergeResult = await this.merger.merge({
      base: forked.fork_of!,
      local: forked,
      upstream: upstream.definition,
    });

    // Handle conflicts interactively
    if (mergeResult.conflicts.length > 0) {
      await this.resolveConflictsInteractively(mergeResult);
    } else {
      // No conflicts, apply directly
      mergeResult.merged.fork_of.version = upstream.version;
      mergeResult.merged.fork_of.merged_at = new Date().toISOString();

      await this.writeYaml(
        path.join(process.cwd(), '.fractary/agents', `${forkedName}.yaml`),
        mergeResult.merged
      );

      this.logger.success('Upstream changes merged successfully');
    }
  }
}
```

### 6.2 Interactive Conflict Resolution

When merging upstream changes into a forked agent, conflicts are resolved interactively with a Git-like workflow:

```typescript
// forge/src/definitions/fork/conflict-resolver.ts
export class ConflictResolver {
  async resolveConflictsInteractively(
    mergeResult: MergeResult
  ): Promise<AgentDefinition> {
    const resolved = { ...mergeResult.merged };

    this.logger.info(`\nFound ${mergeResult.conflicts.length} conflict(s):\n`);

    for (const conflict of mergeResult.conflicts) {
      // Display conflict with diff
      console.log('─'.repeat(60));
      console.log(`Conflict in: ${conflict.path}`);
      console.log('─'.repeat(60));
      console.log('\n<<<<<<< LOCAL (your changes)');
      console.log(this.formatValue(conflict.local));
      console.log('=======');
      console.log(this.formatValue(conflict.upstream));
      console.log('>>>>>>> UPSTREAM\n');

      // Prompt for resolution
      const choice = await this.promptChoice(
        'How would you like to resolve this conflict?',
        [
          { key: 'l', label: 'Keep LOCAL (your changes)' },
          { key: 'u', label: 'Keep UPSTREAM (new version)' },
          { key: 'b', label: 'Keep BOTH (merge manually)' },
          { key: 'e', label: 'Edit manually' },
        ]
      );

      switch (choice) {
        case 'l':
          this.setPath(resolved, conflict.path, conflict.local);
          break;
        case 'u':
          this.setPath(resolved, conflict.path, conflict.upstream);
          break;
        case 'b':
          // For arrays, concatenate; for objects, deep merge
          const merged = this.mergeValues(conflict.local, conflict.upstream);
          this.setPath(resolved, conflict.path, merged);
          break;
        case 'e':
          const edited = await this.openEditor(conflict);
          this.setPath(resolved, conflict.path, edited);
          break;
      }
    }

    // Show final result
    console.log('\n' + '─'.repeat(60));
    console.log('Merge complete. Final definition:');
    console.log('─'.repeat(60));
    console.log(yaml.dump(resolved));

    // Confirm
    const confirmed = await this.promptConfirm('Save merged definition?');

    if (!confirmed) {
      throw new MergeAbortedError('Merge cancelled by user');
    }

    return resolved;
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'object') {
      return yaml.dump(value, { indent: 2 });
    }
    return String(value);
  }
}
```

**Rationale**: Interactive conflict resolution gives users full control over how their customizations are merged with upstream changes. This follows Git's proven workflow, making it familiar to developers while ensuring no unintended changes are automatically applied.

## 7. Caching Strategy

### 7.1 Multi-Level Cache

```
┌─────────────────────────────────────────────┐
│  In-Memory Cache                            │
│  - Parsed definitions (AgentDefinition)     │
│  - Lifetime: Process duration               │
│  - Invalidation: Never (process restart)    │
└─────────────────────────────────────────────┘
                    ↓ miss
┌─────────────────────────────────────────────┐
│  Global Registry Cache                      │
│  - YAML files on disk                       │
│  - Lifetime: Until manual update            │
│  - Invalidation: forge update command       │
└─────────────────────────────────────────────┘
                    ↓ miss
┌─────────────────────────────────────────────┐
│  Stockyard API Cache                        │
│  - HTTP response cache                      │
│  - Lifetime: TTL-based (1 hour default)     │
│  - Invalidation: TTL expiry, manual refresh │
└─────────────────────────────────────────────┘
                    ↓ miss
┌─────────────────────────────────────────────┐
│  Stockyard (Network Request)                │
│  - Remote API call                          │
│  - Always fresh data                        │
└─────────────────────────────────────────────┘
```

### 7.2 Cache Implementation

```typescript
// forge/src/definitions/registry/cache.ts
export class RegistryCache {
  private memoryCache = new Map<string, AgentDefinition>();
  private cacheMetadata = new Map<string, CacheMetadata>();

  async get(name: string): Promise<AgentDefinition | null> {
    // Check in-memory cache first
    if (this.memoryCache.has(name)) {
      const metadata = this.cacheMetadata.get(name)!;

      // Verify freshness
      if (this.isFresh(metadata)) {
        this.logger.debug(`Cache hit (memory): ${name}`);
        return this.memoryCache.get(name)!;
      }

      // Stale, evict
      this.memoryCache.delete(name);
      this.cacheMetadata.delete(name);
    }

    return null;
  }

  async set(name: string, definition: AgentDefinition): Promise<void> {
    this.memoryCache.set(name, definition);
    this.cacheMetadata.set(name, {
      cachedAt: Date.now(),
      ttl: this.config.cache_ttl || 3600000, // 1 hour
    });
  }

  private isFresh(metadata: CacheMetadata): boolean {
    const age = Date.now() - metadata.cachedAt;
    return age < metadata.ttl;
  }

  async invalidate(name?: string): Promise<void> {
    if (name) {
      this.memoryCache.delete(name);
      this.cacheMetadata.delete(name);
    } else {
      this.memoryCache.clear();
      this.cacheMetadata.clear();
    }
  }
}
```

## 8. Update Notifications

### 8.1 Update Check

```typescript
// forge/src/definitions/commands/update.ts
export class UpdateCommand {
  async checkUpdates(): Promise<UpdateReport> {
    const lockfile = await this.lockfileManager.load();
    const updates: Update[] = [];

    // Check each installed agent
    for (const [name, entry] of Object.entries(lockfile.agents)) {
      // Skip local agents
      if (entry.resolved === 'local') continue;

      // Fetch latest metadata
      const manifest = await this.manifestManager.getManifest(name);

      if (semver.gt(manifest.latest, entry.version)) {
        updates.push({
          type: 'agent',
          name,
          current: entry.version,
          latest: manifest.latest,
          breaking: semver.major(manifest.latest) > semver.major(entry.version),
        });
      }
    }

    // Similar for tools...

    return {
      total: updates.length,
      breaking: updates.filter(u => u.breaking).length,
      updates,
    };
  }

  async applyUpdates(options: { breaking?: boolean } = {}): Promise<void> {
    const report = await this.checkUpdates();

    if (report.total === 0) {
      this.logger.success('All agents and tools are up to date');
      return;
    }

    // Filter updates
    const toApply = options.breaking
      ? report.updates
      : report.updates.filter(u => !u.breaking);

    if (toApply.length === 0) {
      this.logger.info('No non-breaking updates available');
      this.logger.info(`Run 'forge update --breaking' to see breaking changes`);
      return;
    }

    // Show updates
    console.log('\nUpdates available:\n');
    for (const update of toApply) {
      const symbol = update.breaking ? '[!]' : '[+]';
      console.log(
        `${symbol} ${update.name}: ${update.current} -> ${update.latest}`
      );
    }

    // Confirm
    const confirmed = await this.promptConfirm('\nApply updates?');

    if (!confirmed) {
      this.logger.info('Update cancelled');
      return;
    }

    // Apply updates
    for (const update of toApply) {
      await this.applyUpdate(update);
    }

    // Regenerate lockfile
    await this.lockfileManager.generateLockfile();

    this.logger.success(`Updated ${toApply.length} agent(s)/tool(s)`);
  }
}
```

## 9. Dependency Resolution

### 9.1 Transitive Dependencies

```typescript
// forge/src/definitions/registry/dependency-resolver.ts
export class DependencyResolver {
  async resolveDependencies(
    agent: AgentDefinition
  ): Promise<DependencyTree> {
    const tree: DependencyTree = {
      agents: {},
      tools: {},
    };

    // Track visited nodes to detect cycles
    const visited = new Set<string>();
    const visiting = new Set<string>();

    await this.resolveRecursive(agent, tree, visited, visiting, [agent.name]);

    return tree;
  }

  private async resolveRecursive(
    definition: AgentDefinition | ToolDefinition,
    tree: DependencyTree,
    visited: Set<string>,
    visiting: Set<string>,
    path: string[]
  ): Promise<void> {
    const key = `${definition.name}@${definition.version}`;

    // Check for circular dependency
    if (visiting.has(key)) {
      const cycle = [...path, definition.name].join(' -> ');
      throw new CircularDependencyError(
        `Circular dependency detected!\n\n` +
        `Dependency chain:\n  ${cycle}\n\n` +
        `The agent '${definition.name}' depends on itself through this chain.\n` +
        `Please remove the circular reference to resolve this issue.`
      );
    }

    // Already fully resolved
    if (visited.has(key)) {
      return;
    }

    visiting.add(key);

    // Resolve tool dependencies
    for (const toolName of definition.tools || []) {
      await this.resolveToolDependency(
        toolName,
        tree,
        visited,
        visiting,
        [...path, toolName]
      );
    }

    // Resolve agent dependencies (if agents can depend on other agents)
    for (const agentName of definition.agents || []) {
      await this.resolveAgentDependency(
        agentName,
        tree,
        visited,
        visiting,
        [...path, agentName]
      );
    }

    // Resolve custom tools (inline, no external deps)
    for (const customTool of definition.custom_tools || []) {
      tree.tools[customTool.name] = {
        version: customTool.version,
        source: 'inline',
      };
    }

    visiting.delete(key);
    visited.add(key);
  }

  private async resolveToolDependency(
    toolName: string,
    tree: DependencyTree,
    visited: Set<string>,
    visiting: Set<string>,
    path: string[]
  ): Promise<void> {
    // Avoid redundant resolution
    if (tree.tools[toolName]) return;

    // Resolve tool
    const tool = await this.resolver.resolveTool(toolName);

    tree.tools[toolName] = {
      version: tool.version,
      source: tool.source,
    };

    // Tools could have their own dependencies in the future
    await this.resolveRecursive(tool.definition, tree, visited, visiting, path);
  }

  private async resolveAgentDependency(
    agentName: string,
    tree: DependencyTree,
    visited: Set<string>,
    visiting: Set<string>,
    path: string[]
  ): Promise<void> {
    if (tree.agents[agentName]) return;

    const agent = await this.resolver.resolveAgent(agentName);

    tree.agents[agentName] = {
      version: agent.version,
      source: agent.source,
    };

    await this.resolveRecursive(agent.definition, tree, visited, visiting, path);
  }
}
```

### 9.2 Circular Dependency Error Example

When a circular dependency is detected, the error provides a clear visualization:

```
CircularDependencyError: Circular dependency detected!

Dependency chain:
  architect-agent -> spec-generator -> validator-agent -> architect-agent

The agent 'architect-agent' depends on itself through this chain.
Please remove the circular reference to resolve this issue.
```

**Rationale**: Failing fast with a clear error prevents infinite loops and makes debugging straightforward. The dependency chain visualization shows exactly where the cycle occurs, enabling quick resolution.

## 10. Stockyard Authentication

### 10.1 Authentication Model

Stockyard supports two access modes:

1. **Anonymous Access**: Read-only access to public packages
2. **Authenticated Access**: Full access including private packages, publishing, and rate limit increases

```typescript
// forge/src/definitions/registry/stockyard/auth.ts
export interface StockyardAuth {
  // Token for authenticated requests
  token?: string;
  // Token source for debugging
  tokenSource?: 'env' | 'config' | 'keychain';
}

export class StockyardAuthManager {
  /**
   * Resolve authentication token from multiple sources (in priority order):
   * 1. Environment variable: STOCKYARD_TOKEN
   * 2. Config file: ~/.fractary/config/forge.json
   * 3. System keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
   */
  async resolveAuth(): Promise<StockyardAuth> {
    // 1. Check environment variable
    const envToken = process.env.STOCKYARD_TOKEN;
    if (envToken) {
      return { token: envToken, tokenSource: 'env' };
    }

    // 2. Check config file
    const configPath = path.join(os.homedir(), '.fractary/config/forge.json');
    if (await fs.pathExists(configPath)) {
      try {
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        if (config.stockyard?.token) {
          return { token: config.stockyard.token, tokenSource: 'config' };
        }
      } catch (error) {
        this.logger.warn(`Failed to read config: ${error.message}`);
      }
    }

    // 3. Check system keychain (optional, graceful fallback)
    try {
      const keychainToken = await this.getFromKeychain('stockyard-token');
      if (keychainToken) {
        return { token: keychainToken, tokenSource: 'keychain' };
      }
    } catch {
      // Keychain not available or token not found
    }

    // No authentication - anonymous access
    return {};
  }

  /**
   * Store token securely
   */
  async storeToken(token: string, method: 'config' | 'keychain' = 'config'): Promise<void> {
    if (method === 'keychain') {
      await this.storeInKeychain('stockyard-token', token);
    } else {
      const configPath = path.join(os.homedir(), '.fractary/config/forge.json');
      await fs.ensureDir(path.dirname(configPath));

      let config = {};
      if (await fs.pathExists(configPath)) {
        config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      }

      config.stockyard = { ...config.stockyard, token };
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

      // Set restrictive permissions
      await fs.chmod(configPath, 0o600);
    }
  }

  /**
   * Login to Stockyard
   */
  async login(): Promise<void> {
    // Interactive login flow
    console.log('Login to Stockyard\n');
    console.log('Visit: https://stockyard.fractary.dev/settings/tokens');
    console.log('Generate a new token and paste it below.\n');

    const token = await this.promptSecret('Token: ');

    // Validate token
    const valid = await this.validateToken(token);
    if (!valid) {
      throw new AuthenticationError('Invalid token. Please check and try again.');
    }

    // Store token
    await this.storeToken(token);

    this.logger.success('Successfully logged in to Stockyard');
  }

  private async validateToken(token: string): Promise<boolean> {
    try {
      const response = await axios.get('https://stockyard.fractary.dev/api/v1/user', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
```

### 10.2 Stockyard Client with Auth

```typescript
// forge/src/definitions/registry/stockyard/client.ts
export class StockyardClient {
  private auth: StockyardAuth;

  constructor(
    private config: StockyardConfig,
    private authManager: StockyardAuthManager
  ) {}

  async initialize(): Promise<void> {
    this.auth = await this.authManager.resolveAuth();
    if (this.auth.token) {
      this.logger.debug(`Authenticated via ${this.auth.tokenSource}`);
    } else {
      this.logger.debug('Using anonymous access (public packages only)');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': `forge/${version}`,
    };

    if (this.auth.token) {
      headers['Authorization'] = `Bearer ${this.auth.token}`;
    }

    return headers;
  }

  async getAgentMetadata(name: string): Promise<StockyardAgentMetadata> {
    try {
      const response = await axios.get(
        `${this.config.url}/api/v1/agents/${name}/metadata`,
        {
          headers: this.getHeaders(),
          timeout: this.config.timeout || 10000,
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new AuthenticationError(
          'Authentication required for this resource.\n' +
          'Run `forge login` to authenticate with Stockyard.'
        );
      }
      if (error.response?.status === 403) {
        throw new AuthorizationError(
          `Access denied to agent '${name}'.\n` +
          'This may be a private package or you lack permission.'
        );
      }
      throw error;
    }
  }
}
```

**Rationale**: Token-based authentication with optional anonymous access balances security with ease of use. Public packages work without authentication, reducing friction for open-source usage. The multi-source token resolution (env, config, keychain) supports different deployment scenarios from CI/CD to local development.

## 11. CLI Commands

### 11.1 Command Reference

```bash
# List installed agents
forge list agents [--tags data-engineering]

# List available tools
forge list tools

# Install agent
forge install frame-agent@2.0.0

# Update check
forge update --check

# Apply updates
forge update [--breaking]

# Fork agent
forge fork frame-agent my-frame-agent

# Check upstream updates for fork
forge upstream-check my-frame-agent

# Merge upstream changes
forge merge-upstream my-frame-agent

# Show agent info
forge info frame-agent

# Search Stockyard
forge search "terraform"

# Validate definitions
forge validate [--all]

# Generate lockfile
forge lock

# Authentication
forge login
forge logout
forge whoami
```

## 12. Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Resolve (cached) | < 10ms | In-memory cache hit |
| Resolve (global) | < 100ms | Disk read + parse |
| Resolve (network) | < 2s | Stockyard API call |
| Lockfile generation | < 5s | For typical project (10-20 agents) |
| Update check | < 3s | Parallel manifest fetches |
| Dependency resolution | < 500ms | With cycle detection |

## 13. Design Decisions

This section documents key design decisions made during specification refinement.

### 13.1 Circular Dependencies: Fail Fast

**Decision**: Detect cycles during dependency resolution and immediately error with a helpful message showing the complete dependency chain.

**Behavior**:
- Cycle detection uses visited/visiting sets during graph traversal
- When a cycle is detected, resolution stops immediately
- Error message includes the full dependency chain for debugging

**Example Error**:
```
CircularDependencyError: Circular dependency detected!

Dependency chain:
  architect-agent -> spec-generator -> validator-agent -> architect-agent

The agent 'architect-agent' depends on itself through this chain.
Please remove the circular reference to resolve this issue.
```

**Rationale**: Simple, predictable behavior that prevents infinite loops and makes debugging straightforward.

### 13.2 Offline Cache Miss: Fail Fast

**Decision**: When a lockfile references a version not present in the global cache, error immediately with instructions to run `forge install`.

**Behavior**:
- No silent fallbacks to different versions
- No automatic network requests when in offline mode
- Clear error message with exact command to fix

**Example Error**:
```
CacheMissError: Agent 'frame-agent@2.0.0' not found in global cache.
The lockfile references this version but it is not installed locally.

To fix this, run:
  forge install

This will download all locked versions to your global cache.
```

**Rationale**: Fail-fast provides clear, predictable errors. Silent fallbacks lead to subtle bugs and inconsistent behavior across environments.

### 13.3 Fork Merge Conflicts: Interactive Resolution

**Decision**: Use interactive conflict resolution with a Git-like workflow when merging upstream changes into forked agents.

**Behavior**:
- Display conflicts with diff format (<<<<<<< LOCAL / >>>>>>> UPSTREAM)
- Prompt for resolution choice per conflict
- Options: keep local, keep upstream, merge both, edit manually
- Show final merged result before saving
- Require explicit confirmation

**Rationale**: Git-like workflow is familiar to developers. Interactive resolution gives users full control and prevents unintended changes.

### 13.4 Local Agent Versioning: YAML Version Field

**Decision**: Local agents declare their version in the YAML definition file's `version` field.

**Behavior**:
- `version` field is required for local agents
- Loader validates semver format
- Missing version causes immediate validation error

**Example**:
```yaml
name: my-custom-agent
version: 1.2.0  # Required
description: Custom agent
```

**Rationale**: Self-contained versioning is consistent with package ecosystems. Version information travels with the definition file.

### 13.5 Stockyard Authentication: Token-Based with Anonymous Fallback

**Decision**: Token-based authentication with optional anonymous access for public packages.

**Behavior**:
- Anonymous access: read-only for public packages
- Authenticated access: full access including private packages
- Token resolution order: environment variable, config file, system keychain
- `forge login` command for interactive authentication

**Token Sources**:
1. `STOCKYARD_TOKEN` environment variable
2. `~/.fractary/config/forge.json` (mode 0600)
3. System keychain (optional)

**Rationale**: Balances security with ease of use. Public packages work without authentication, reducing friction. Multiple token sources support CI/CD and local development scenarios.

## 14. Success Criteria

- [ ] Three-tier resolution works (local -> global -> Stockyard)
- [ ] Version constraints correctly resolved
- [ ] Lockfile pins exact versions
- [ ] Fork workflow supports customization + upstream tracking
- [ ] Interactive conflict resolution for fork merges
- [ ] Update notifications work reliably
- [ ] Cache invalidation is correct
- [ ] Performance targets met
- [ ] Offline mode works after initial download (fail-fast on cache miss)
- [ ] Dependency resolution handles transitive deps with cycle detection
- [ ] Local agents require version field in YAML
- [ ] Stockyard authentication supports token-based and anonymous access

## 15. Related Specifications

- **SPEC-FORGE-001**: Agent & Tool Definition System Architecture
- **SPEC-FABER-002**: Forge Integration Interface
- **SPEC-MIGRATION-001**: Cross-Project Migration Guide

---

## Changelog

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-12-14 | 1.0.0 | Claude | Initial specification |
| 2025-12-14 | 1.1.0 | Claude | Refinement round 1: Resolved open questions - circular dependencies (fail fast), offline cache miss (fail fast), merge conflicts (interactive), local versioning (YAML field), Stockyard auth (token-based) |
