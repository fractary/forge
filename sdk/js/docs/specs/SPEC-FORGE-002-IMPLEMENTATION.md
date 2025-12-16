# SPEC-FORGE-002-IMPLEMENTATION: Agent Registry & Resolution - Forge SDK Implementation

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Created** | 2025-12-14 |
| **Updated** | 2025-12-14 |
| **Author** | Implementation Team |
| **Project** | `@fractary/forge` |
| **Parent Spec** | SPEC-FORGE-002 |
| **Related** | SPEC-FORGE-001-IMPLEMENTATION, SPEC-000001 |
| **Phase** | Phase 2: Registry & Resolution |

---

## 1. Executive Summary

This specification provides **concrete implementation guidance** for building the Agent Registry & Resolution System within the `@fractary/forge` SDK. It references [SPEC-FORGE-002](./SPEC-FORGE-002-agent-registry-resolution.md) as the architectural blueprint and builds upon the foundation established in [SPEC-FORGE-001-IMPLEMENTATION](./SPEC-FORGE-001-IMPLEMENTATION.md).

### 1.1 Relationship to Previous Work

```
┌─────────────────────────────────────────────────────────┐
│  SPEC-FORGE-001-IMPLEMENTATION (Phase 1 - COMPLETED)    │
│  ✓ Agent & Tool Definition System                      │
│  ✓ YAML schemas, validation, loading                   │
│  ✓ Basic 3-tier resolution (stub Stockyard)            │
│  ✓ In-memory cache                                      │
│  ✓ Semver version constraints                           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Builds Upon
                  ▼
┌─────────────────────────────────────────────────────────┐
│  SPEC-FORGE-002-IMPLEMENTATION (Phase 2 - THIS DOC)     │
│  → Lockfile system for version pinning                 │
│  → Manifest management & metadata                       │
│  → Stockyard integration (remote API)                   │
│  → Fork workflow & upstream tracking                    │
│  → Update notifications                                  │
│  → Dependency resolution                                 │
│  → CLI commands for registry operations                 │
└─────────────────────────────────────────────────────────┘
```

### 1.2 What's Already Implemented

From Phase 1 (SPEC-FORGE-001-IMPLEMENTATION), we already have:

| Component | Status | Location |
|-----------|--------|----------|
| Basic Resolver | ✅ Complete | `src/definitions/registry/resolver.ts` |
| In-Memory Cache | ✅ Complete | `src/definitions/registry/cache.ts` |
| Semver Parsing | ✅ Complete | Resolver includes full semver support |
| Registry Types | ✅ Complete | `src/definitions/registry/types.ts` |
| YAML Loading | ✅ Complete | `src/definitions/loaders/` |
| Inheritance | ✅ Complete | `src/definitions/loaders/inheritance.ts` |

### 1.3 What Needs to Be Implemented

This specification covers the **missing pieces** from SPEC-FORGE-002:

| Component | Priority | Complexity | Dependencies |
|-----------|----------|------------|--------------|
| Lockfile System | High | Medium | None |
| Manifest Management | High | Medium | None |
| Dependency Resolver | High | Medium | Lockfile |
| Stockyard Client | Medium | High | None |
| Stockyard Resolver | Medium | Medium | Stockyard Client |
| Fork Manager | Low | Medium | Resolver |
| Update Manager | Low | Low | Manifest |
| CLI Commands | Low | Low | All above |

## 2. Extended Directory Structure

We'll add the following to the existing `src/definitions/registry/` structure:

```
src/definitions/registry/
├── resolver.ts                    # ✅ EXISTS - Basic 3-tier resolver
├── cache.ts                       # ✅ EXISTS - In-memory cache
├── types.ts                       # ✅ EXISTS - Basic types
├── index.ts                       # ✅ EXISTS - Exports
│
├── lockfile/                      # 🆕 NEW - Lockfile management
│   ├── lockfile-manager.ts       # Generate, load, save lockfiles
│   ├── integrity.ts              # Calculate SHA-256 integrity hashes
│   ├── discovery.ts              # Discover used agents/tools
│   ├── types.ts                  # Lockfile types
│   └── index.ts
│
├── manifest/                      # 🆕 NEW - Manifest management
│   ├── manifest-manager.ts       # Load, save, update manifests
│   ├── manifest-sync.ts          # Sync manifests from Stockyard
│   ├── types.ts                  # Manifest types
│   └── index.ts
│
├── stockyard/                     # 🆕 NEW - Stockyard integration
│   ├── client.ts                 # HTTP client for Stockyard API
│   ├── resolver.ts               # Stockyard-specific resolver
│   ├── cache.ts                  # Stockyard API response cache
│   ├── types.ts                  # Stockyard API types
│   └── index.ts
│
├── dependency/                    # 🆕 NEW - Dependency resolution
│   ├── dependency-resolver.ts    # Build dependency trees
│   ├── graph.ts                  # Dependency graph utilities
│   ├── types.ts                  # Dependency types
│   └── index.ts
│
└── fork/                          # 🆕 NEW - Fork management
    ├── fork-manager.ts           # Fork, track, merge workflows
    ├── merge.ts                  # 3-way merge utilities
    ├── diff.ts                   # Diff utilities
    ├── types.ts                  # Fork types
    └── index.ts

src/commands/                      # 🆕 NEW - CLI commands (optional)
├── install.ts                    # forge install <agent>
├── update.ts                     # forge update [--check]
├── fork.ts                       # forge fork <source> <target>
├── list.ts                       # forge list [agents|tools]
├── info.ts                       # forge info <agent>
├── lock.ts                       # forge lock (generate lockfile)
└── index.ts
```

## 3. Core Implementation Details

### 3.1 Lockfile System

#### 3.1.1 Lockfile Types

```typescript
// src/definitions/registry/lockfile/types.ts
import type { AgentDefinition, ToolDefinition } from '../../schemas';

export interface Lockfile {
  version: number; // Lockfile format version
  generated: string; // ISO timestamp
  agents: Record<string, LockfileEntry>;
  tools: Record<string, LockfileEntry>;
}

export interface LockfileEntry {
  version: string; // Exact version (not a range)
  resolved: 'local' | 'global' | 'stockyard';
  integrity: string; // SHA-256 hash
  dependencies?: LockfileDependencies;
}

export interface LockfileDependencies {
  agents?: Record<string, string>; // name -> version
  tools?: Record<string, string>; // name -> version
}

export interface LockfileGenerateOptions {
  force?: boolean; // Regenerate even if lockfile exists
  validate?: boolean; // Validate integrity after generation
}

export interface LockfileValidationResult {
  valid: boolean;
  errors: LockfileValidationError[];
  warnings: LockfileValidationWarning[];
}

export interface LockfileValidationError {
  type: 'missing' | 'integrity_mismatch' | 'version_mismatch';
  name: string;
  expected?: string;
  actual?: string;
}

export interface LockfileValidationWarning {
  type: 'outdated' | 'deprecated';
  name: string;
  message: string;
}
```

#### 3.1.2 Lockfile Manager

```typescript
// src/definitions/registry/lockfile/lockfile-manager.ts
import * as path from 'path';
import * as fs from 'fs-extra';
import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import type { DefinitionResolver } from '../resolver';
import type { Lockfile, LockfileGenerateOptions, LockfileValidationResult } from './types';
import { calculateIntegrity } from './integrity';
import { discoverUsedAgents, discoverUsedTools } from './discovery';

export class LockfileManager {
  private lockfilePath: string;

  constructor(
    private resolver: DefinitionResolver,
    projectRoot: string = process.cwd()
  ) {
    this.lockfilePath = path.join(
      projectRoot,
      '.fractary/plugins/forge/lockfile.json'
    );
  }

  /**
   * Generate lockfile from project usage
   */
  async generate(options: LockfileGenerateOptions = {}): Promise<Lockfile> {
    logger.info('Generating lockfile...');

    // Check if lockfile exists
    if (!options.force && (await fs.pathExists(this.lockfilePath))) {
      logger.warn('Lockfile already exists. Use --force to regenerate.');
      return await this.load();
    }

    const lockfile: Lockfile = {
      version: 1,
      generated: new Date().toISOString(),
      agents: {},
      tools: {},
    };

    // Discover used agents
    const usedAgents = await discoverUsedAgents();
    logger.debug(`Discovered ${usedAgents.length} agents`);

    // Resolve each agent
    for (const agentName of usedAgents) {
      try {
        const resolved = await this.resolver.resolveAgent(agentName);

        lockfile.agents[agentName] = {
          version: resolved.version,
          resolved: resolved.source,
          integrity: await calculateIntegrity(resolved.definition),
          dependencies: await this.resolveDependencies(resolved.definition),
        };

        // Add agent's tools to lockfile
        for (const toolRef of resolved.definition.tools || []) {
          if (!lockfile.tools[toolRef]) {
            await this.addToolToLockfile(lockfile, toolRef);
          }
        }
      } catch (error) {
        logger.error(`Failed to resolve agent ${agentName}: ${error.message}`);
        throw error;
      }
    }

    // Discover used tools (not already added via agents)
    const usedTools = await discoverUsedTools();
    for (const toolName of usedTools) {
      if (!lockfile.tools[toolName]) {
        await this.addToolToLockfile(lockfile, toolName);
      }
    }

    // Save lockfile
    await this.save(lockfile);

    // Validate if requested
    if (options.validate) {
      const validation = await this.validate(lockfile);
      if (!validation.valid) {
        logger.warn('Lockfile validation warnings:', validation.warnings);
      }
    }

    logger.success(`Lockfile generated: ${this.lockfilePath}`);
    return lockfile;
  }

  /**
   * Load existing lockfile
   */
  async load(): Promise<Lockfile> {
    if (!(await fs.pathExists(this.lockfilePath))) {
      throw new ForgeError(
        DefinitionErrorCode.LOCKFILE_INVALID,
        'Lockfile not found. Run `forge lock` to generate.',
        { path: this.lockfilePath }
      );
    }

    try {
      const content = await fs.readFile(this.lockfilePath, 'utf-8');
      const lockfile = JSON.parse(content) as Lockfile;

      // Validate format
      if (lockfile.version !== 1) {
        throw new Error(`Unsupported lockfile version: ${lockfile.version}`);
      }

      return lockfile;
    } catch (error) {
      throw new ForgeError(
        DefinitionErrorCode.LOCKFILE_INVALID,
        `Failed to load lockfile: ${error.message}`,
        { path: this.lockfilePath }
      );
    }
  }

  /**
   * Save lockfile
   */
  async save(lockfile: Lockfile): Promise<void> {
    await fs.ensureDir(path.dirname(this.lockfilePath));
    await fs.writeFile(this.lockfilePath, JSON.stringify(lockfile, null, 2), 'utf-8');
  }

  /**
   * Validate lockfile against current definitions
   */
  async validate(lockfile?: Lockfile): Promise<LockfileValidationResult> {
    const lf = lockfile || (await this.load());
    const result: LockfileValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Validate agents
    for (const [name, entry] of Object.entries(lf.agents)) {
      try {
        const resolved = await this.resolver.resolveAgent(`${name}@${entry.version}`);

        // Check integrity
        const currentIntegrity = await calculateIntegrity(resolved.definition);
        if (currentIntegrity !== entry.integrity) {
          result.valid = false;
          result.errors.push({
            type: 'integrity_mismatch',
            name,
            expected: entry.integrity,
            actual: currentIntegrity,
          });
        }
      } catch (error) {
        result.valid = false;
        result.errors.push({
          type: 'missing',
          name,
        });
      }
    }

    // Similar validation for tools...

    return result;
  }

  /**
   * Add tool to lockfile
   */
  private async addToolToLockfile(lockfile: Lockfile, toolName: string): Promise<void> {
    try {
      const resolved = await this.resolver.resolveTool(toolName);

      lockfile.tools[toolName] = {
        version: resolved.version,
        resolved: resolved.source,
        integrity: await calculateIntegrity(resolved.definition),
      };
    } catch (error) {
      logger.warn(`Failed to resolve tool ${toolName}: ${error.message}`);
    }
  }

  /**
   * Resolve dependencies for an agent
   */
  private async resolveDependencies(
    definition: any
  ): Promise<{ tools?: Record<string, string> }> {
    const deps: { tools?: Record<string, string> } = {};

    if (definition.tools && definition.tools.length > 0) {
      deps.tools = {};
      for (const toolRef of definition.tools) {
        try {
          const resolved = await this.resolver.resolveTool(toolRef);
          deps.tools[toolRef] = resolved.version;
        } catch {
          // Tool not found, skip
        }
      }
    }

    return deps;
  }
}
```

#### 3.1.3 Integrity Calculation

```typescript
// src/definitions/registry/lockfile/integrity.ts
import * as crypto from 'crypto';
import type { AgentDefinition, ToolDefinition } from '../../schemas';

/**
 * Calculate SHA-256 integrity hash for a definition
 */
export async function calculateIntegrity(
  definition: AgentDefinition | ToolDefinition
): Promise<string> {
  // Create deterministic JSON representation
  const canonical = canonicalize(definition);
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  return `sha256-${hash}`;
}

/**
 * Canonicalize definition for consistent hashing
 */
function canonicalize(obj: any): string {
  // Sort keys recursively for deterministic output
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalize).join(',')}]`;
  }

  const keys = Object.keys(obj).sort();
  const pairs = keys.map((key) => `"${key}":${canonicalize(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Verify integrity of a definition
 */
export async function verifyIntegrity(
  definition: AgentDefinition | ToolDefinition,
  expectedIntegrity: string
): Promise<boolean> {
  const actualIntegrity = await calculateIntegrity(definition);
  return actualIntegrity === expectedIntegrity;
}
```

#### 3.1.4 Discovery Utilities

```typescript
// src/definitions/registry/lockfile/discovery.ts
import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';
import { logger } from '../../../logger';

/**
 * Discover agents used in the project
 */
export async function discoverUsedAgents(): Promise<string[]> {
  const agents = new Set<string>();

  // 1. Scan .fractary/agents/ for local agents
  const localAgentsPath = path.join(process.cwd(), '.fractary/agents');
  if (await fs.pathExists(localAgentsPath)) {
    const files = await glob(path.join(localAgentsPath, '*.yaml'));
    for (const file of files) {
      const name = path.basename(file, '.yaml');
      agents.add(name);
    }
  }

  // 2. Scan workflow files (if FABER integration exists)
  // TODO: Implement workflow scanning when FABER integration is added

  // 3. Scan configuration files for agent references
  const configPath = path.join(process.cwd(), '.fractary/plugins/forge/config.json');
  if (await fs.pathExists(configPath)) {
    try {
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      if (config.agents) {
        for (const agentName of Object.keys(config.agents)) {
          agents.add(agentName);
        }
      }
    } catch (error) {
      logger.warn(`Failed to parse config: ${error.message}`);
    }
  }

  return Array.from(agents);
}

/**
 * Discover tools used in the project
 */
export async function discoverUsedTools(): Promise<string[]> {
  const tools = new Set<string>();

  // Scan .fractary/tools/ for local tools
  const localToolsPath = path.join(process.cwd(), '.fractary/tools');
  if (await fs.pathExists(localToolsPath)) {
    const files = await glob(path.join(localToolsPath, '*.yaml'));
    for (const file of files) {
      const name = path.basename(file, '.yaml');
      tools.add(name);
    }
  }

  return Array.from(tools);
}
```

### 3.2 Manifest Management

#### 3.2.1 Manifest Types

```typescript
// src/definitions/registry/manifest/types.ts

export interface PackageManifest {
  name: string;
  type: 'agent' | 'tool';
  description: string;

  // Available versions
  versions: ManifestVersion[];

  // Latest stable version
  latest: string;

  // Dependencies
  dependencies?: {
    agents?: Record<string, string>; // name -> version constraint
    tools?: Record<string, string>;
  };

  // Stockyard metadata
  stockyard?: {
    author: string;
    license: string;
    homepage: string;
    repository: string;
    downloads: number;
    rating: number;
    tags: string[];
  };

  // Fork tracking
  fork_of?: string | null;
  forks?: ForkInfo[];

  // Local installation metadata
  installed_versions: string[];
  active_version?: string; // Version used in lockfile
  last_checked: string; // ISO timestamp
  update_available: boolean;
}

export interface ManifestVersion {
  version: string;
  released: string; // ISO timestamp
  status: 'stable' | 'beta' | 'alpha' | 'deprecated';
  changelog_url?: string;
  deprecation_message?: string;
}

export interface ForkInfo {
  name: string;
  author: string;
  url: string;
}

export interface ManifestSyncOptions {
  force?: boolean; // Force sync even if recently checked
  agents?: string[]; // Specific agents to sync (default: all)
  tools?: string[]; // Specific tools to sync (default: all)
}
```

#### 3.2.2 Manifest Manager

```typescript
// src/definitions/registry/manifest/manifest-manager.ts
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import type { PackageManifest } from './types';

export class ManifestManager {
  private manifestDir: string;

  constructor(globalRegistryPath?: string) {
    this.manifestDir = path.join(
      globalRegistryPath || path.join(os.homedir(), '.fractary/registry'),
      'manifests'
    );
  }

  /**
   * Get manifest for an agent or tool
   */
  async getManifest(name: string): Promise<PackageManifest | null> {
    const manifestPath = path.join(this.manifestDir, `${name}.json`);

    if (!(await fs.pathExists(manifestPath))) {
      return null;
    }

    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(content) as PackageManifest;
    } catch (error) {
      logger.warn(`Failed to load manifest for ${name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Save manifest
   */
  async saveManifest(manifest: PackageManifest): Promise<void> {
    await fs.ensureDir(this.manifestDir);
    const manifestPath = path.join(this.manifestDir, `${manifest.name}.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    logger.debug(`Saved manifest: ${manifest.name}`);
  }

  /**
   * Create or update manifest from definition
   */
  async updateManifest(
    name: string,
    type: 'agent' | 'tool',
    options: Partial<PackageManifest> = {}
  ): Promise<PackageManifest> {
    const existing = await this.getManifest(name);

    const manifest: PackageManifest = {
      name,
      type,
      description: options.description || existing?.description || '',
      versions: options.versions || existing?.versions || [],
      latest: options.latest || existing?.latest || '1.0.0',
      dependencies: options.dependencies || existing?.dependencies,
      stockyard: options.stockyard || existing?.stockyard,
      fork_of: options.fork_of !== undefined ? options.fork_of : existing?.fork_of,
      forks: options.forks || existing?.forks || [],
      installed_versions: options.installed_versions || existing?.installed_versions || [],
      active_version: options.active_version || existing?.active_version,
      last_checked: new Date().toISOString(),
      update_available: false,
    };

    await this.saveManifest(manifest);
    return manifest;
  }

  /**
   * Track fork relationship
   */
  async trackFork(sourceName: string, forkedName: string): Promise<void> {
    const sourceManifest = await this.getManifest(sourceName);
    if (!sourceManifest) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_NOT_FOUND,
        `Source manifest not found: ${sourceName}`,
        { name: sourceName }
      );
    }

    // Add to forks list
    if (!sourceManifest.forks) {
      sourceManifest.forks = [];
    }

    sourceManifest.forks.push({
      name: forkedName,
      author: 'local',
      url: 'local',
    });

    await this.saveManifest(sourceManifest);
    logger.info(`Tracked fork: ${forkedName} from ${sourceName}`);
  }

  /**
   * List all manifests
   */
  async listManifests(type?: 'agent' | 'tool'): Promise<PackageManifest[]> {
    await fs.ensureDir(this.manifestDir);
    const files = await fs.readdir(this.manifestDir);

    const manifests: PackageManifest[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const manifest = await this.getManifest(path.basename(file, '.json'));
      if (manifest && (!type || manifest.type === type)) {
        manifests.push(manifest);
      }
    }

    return manifests;
  }
}
```

#### 3.2.3 Manifest Sync

```typescript
// src/definitions/registry/manifest/manifest-sync.ts
import { logger } from '../../../logger';
import type { ManifestManager } from './manifest-manager';
import type { StockyardClient } from '../stockyard/client';
import type { ManifestSyncOptions } from './types';
import * as semver from 'semver';

export class ManifestSync {
  private manifestTtl = 3600000; // 1 hour

  constructor(
    private manifestManager: ManifestManager,
    private stockyardClient: StockyardClient
  ) {}

  /**
   * Sync manifests from Stockyard
   */
  async sync(options: ManifestSyncOptions = {}): Promise<void> {
    logger.info('Syncing manifests from Stockyard...');

    // Get all local manifests
    const localManifests = await this.manifestManager.listManifests();

    for (const manifest of localManifests) {
      // Skip if specified and not in list
      if (options.agents && manifest.type === 'agent' && !options.agents.includes(manifest.name)) {
        continue;
      }
      if (options.tools && manifest.type === 'tool' && !options.tools.includes(manifest.name)) {
        continue;
      }

      // Check if update needed
      const timeSinceCheck = Date.now() - new Date(manifest.last_checked).getTime();
      if (!options.force && timeSinceCheck < this.manifestTtl) {
        logger.debug(`Skipping ${manifest.name} (recently checked)`);
        continue;
      }

      // Fetch latest metadata from Stockyard
      try {
        const latest =
          manifest.type === 'agent'
            ? await this.stockyardClient.getAgentMetadata(manifest.name)
            : await this.stockyardClient.getToolMetadata(manifest.name);

        // Update manifest
        manifest.versions = latest.versions;
        manifest.latest = latest.latest;
        manifest.stockyard = latest.stockyard;
        manifest.last_checked = new Date().toISOString();

        // Check if update available
        if (manifest.active_version) {
          manifest.update_available = semver.gt(latest.latest, manifest.active_version);

          if (manifest.update_available) {
            logger.info(
              `Update available: ${manifest.name}@${manifest.active_version} → ${latest.latest}`
            );
          }
        }

        // Save updated manifest
        await this.manifestManager.saveManifest(manifest);
      } catch (error) {
        logger.warn(`Failed to sync manifest for ${manifest.name}: ${error.message}`);
      }
    }

    logger.success('Manifest sync complete');
  }
}
```

### 3.3 Stockyard Integration

#### 3.3.1 Stockyard Types

```typescript
// src/definitions/registry/stockyard/types.ts

export interface StockyardConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
}

export interface StockyardAgentMetadata {
  name: string;
  description: string;
  versions: Array<{
    version: string;
    released: string;
    status: 'stable' | 'beta' | 'alpha' | 'deprecated';
    changelog_url?: string;
  }>;
  latest: string;
  stockyard: {
    author: string;
    license: string;
    homepage: string;
    repository: string;
    downloads: number;
    rating: number;
    tags: string[];
  };
}

export interface StockyardToolMetadata {
  name: string;
  description: string;
  versions: Array<{
    version: string;
    released: string;
    status: 'stable' | 'beta' | 'alpha' | 'deprecated';
  }>;
  latest: string;
  stockyard: {
    author: string;
    license: string;
    tags: string[];
  };
}

export interface StockyardSearchResult {
  results: Array<{
    name: string;
    type: 'agent' | 'tool';
    description: string;
    version: string;
    author: string;
    rating: number;
    downloads: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
}
```

#### 3.3.2 Stockyard Client

```typescript
// src/definitions/registry/stockyard/client.ts
import axios, { AxiosInstance } from 'axios';
import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import type {
  StockyardConfig,
  StockyardAgentMetadata,
  StockyardToolMetadata,
  StockyardSearchResult,
} from './types';
import type { AgentDefinition, ToolDefinition } from '../../schemas';

export class StockyardClient {
  private client: AxiosInstance;

  constructor(private config: StockyardConfig) {
    this.client = axios.create({
      baseURL: config.url,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });
  }

  /**
   * Get agent metadata
   */
  async getAgentMetadata(name: string): Promise<StockyardAgentMetadata> {
    try {
      logger.debug(`Fetching agent metadata from Stockyard: ${name}`);
      const response = await this.client.get(`/api/v1/agents/${name}/metadata`);
      return response.data;
    } catch (error) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_NOT_FOUND,
        `Failed to fetch agent metadata from Stockyard: ${error.message}`,
        { name, error }
      );
    }
  }

  /**
   * Get tool metadata
   */
  async getToolMetadata(name: string): Promise<StockyardToolMetadata> {
    try {
      logger.debug(`Fetching tool metadata from Stockyard: ${name}`);
      const response = await this.client.get(`/api/v1/tools/${name}/metadata`);
      return response.data;
    } catch (error) {
      throw new ForgeError(
        DefinitionErrorCode.TOOL_NOT_FOUND,
        `Failed to fetch tool metadata from Stockyard: ${error.message}`,
        { name, error }
      );
    }
  }

  /**
   * Download agent definition
   */
  async downloadAgent(name: string, version: string): Promise<AgentDefinition> {
    try {
      logger.debug(`Downloading agent from Stockyard: ${name}@${version}`);
      const response = await this.client.get(`/api/v1/agents/${name}/versions/${version}`);
      return response.data;
    } catch (error) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_NOT_FOUND,
        `Failed to download agent from Stockyard: ${error.message}`,
        { name, version, error }
      );
    }
  }

  /**
   * Download tool definition
   */
  async downloadTool(name: string, version: string): Promise<ToolDefinition> {
    try {
      logger.debug(`Downloading tool from Stockyard: ${name}@${version}`);
      const response = await this.client.get(`/api/v1/tools/${name}/versions/${version}`);
      return response.data;
    } catch (error) {
      throw new ForgeError(
        DefinitionErrorCode.TOOL_NOT_FOUND,
        `Failed to download tool from Stockyard: ${error.message}`,
        { name, version, error }
      );
    }
  }

  /**
   * Search agents and tools
   */
  async search(
    query: string,
    options: { type?: 'agent' | 'tool'; page?: number; pageSize?: number } = {}
  ): Promise<StockyardSearchResult> {
    try {
      logger.debug(`Searching Stockyard: ${query}`);
      const response = await this.client.get('/api/v1/search', {
        params: {
          q: query,
          type: options.type,
          page: options.page || 1,
          pageSize: options.pageSize || 20,
        },
      });
      return response.data;
    } catch (error) {
      throw new ForgeError(
        DefinitionErrorCode.DEFINITION_NOT_FOUND,
        `Failed to search Stockyard: ${error.message}`,
        { query, error }
      );
    }
  }
}
```

#### 3.3.3 Stockyard Resolver

```typescript
// src/definitions/registry/stockyard/resolver.ts
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { logger } from '../../../logger';
import { StockyardClient } from './client';
import { StockyardCache } from './cache';
import type { ResolvedAgent, ResolvedTool } from '../types';
import type { AgentDefinition, ToolDefinition } from '../../schemas';
import type { ManifestManager } from '../manifest/manifest-manager';

export class StockyardResolver {
  private cache: StockyardCache;

  constructor(
    private client: StockyardClient,
    private manifestManager: ManifestManager,
    private globalRegistryPath: string = path.join(os.homedir(), '.fractary/registry')
  ) {
    this.cache = new StockyardCache();
  }

  /**
   * Resolve agent from Stockyard
   */
  async resolveAgent(name: string, versionRange: string): Promise<ResolvedAgent | null> {
    logger.info(`Resolving agent from Stockyard: ${name}@${versionRange}`);

    // Get metadata
    const metadata = await this.client.getAgentMetadata(name);

    // Find best matching version
    const version = this.findBestVersion(metadata.versions, versionRange);
    if (!version) {
      logger.warn(`No matching version found for ${name}@${versionRange}`);
      return null;
    }

    // Download definition
    const definition = await this.client.downloadAgent(name, version);

    // Cache to global registry
    await this.cacheToGlobal('agents', name, version, definition);

    // Update manifest
    await this.manifestManager.updateManifest(name, 'agent', {
      description: metadata.description,
      versions: metadata.versions,
      latest: metadata.latest,
      stockyard: metadata.stockyard,
      installed_versions: [version],
      active_version: version,
    });

    return {
      definition,
      source: 'stockyard',
      version,
      path: this.getGlobalPath('agents', name, version),
    };
  }

  /**
   * Resolve tool from Stockyard
   */
  async resolveTool(name: string, versionRange: string): Promise<ResolvedTool | null> {
    logger.info(`Resolving tool from Stockyard: ${name}@${versionRange}`);

    // Similar implementation to resolveAgent...
    // TODO: Implement
    return null;
  }

  /**
   * Cache definition to global registry
   */
  private async cacheToGlobal(
    type: 'agents' | 'tools',
    name: string,
    version: string,
    definition: AgentDefinition | ToolDefinition
  ): Promise<void> {
    const targetPath = this.getGlobalPath(type, name, version);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, yaml.dump(definition), 'utf-8');
    logger.debug(`Cached to global registry: ${targetPath}`);
  }

  /**
   * Get global registry path
   */
  private getGlobalPath(type: 'agents' | 'tools', name: string, version: string): string {
    return path.join(this.globalRegistryPath, type, `${name}@${version}.yaml`);
  }

  /**
   * Find best matching version
   */
  private findBestVersion(
    versions: Array<{ version: string; status: string }>,
    range: string
  ): string | null {
    // Filter stable versions
    const stableVersions = versions
      .filter((v) => v.status === 'stable')
      .map((v) => v.version);

    if (stableVersions.length === 0) {
      return null;
    }

    // Use semver to find best match
    const semver = require('semver');
    const normalizedRange = range === 'latest' ? '*' : range;
    return semver.maxSatisfying(stableVersions, normalizedRange);
  }
}
```

#### 3.3.4 Stockyard Cache

```typescript
// src/definitions/registry/stockyard/cache.ts
import { logger } from '../../../logger';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class StockyardCache {
  private cache = new Map<string, CacheEntry<any>>();
  private ttl = 3600000; // 1 hour

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    logger.debug(`Stockyard cache hit: ${key}`);
    return entry.value;
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
    logger.debug(`Stockyard cache set: ${key}`);
  }

  clear(): void {
    this.cache.clear();
    logger.debug('Stockyard cache cleared');
  }
}
```

### 3.4 Fork Management

#### 3.4.1 Fork Types

```typescript
// src/definitions/registry/fork/types.ts

export interface ForkMetadata {
  name: string;
  version: string;
  forked_at: string; // ISO timestamp
  merged_at?: string; // ISO timestamp of last merge
}

export interface ForkOptions {
  sourceName: string;
  targetName: string;
  customizations?: Record<string, any>; // Initial customizations
}

export interface MergeOptions {
  strategy?: 'auto' | 'manual'; // Auto-merge or show conflicts
  confirm?: boolean; // Prompt for confirmation
}

export interface MergeResult {
  success: boolean;
  conflicts: MergeConflict[];
  merged: any; // Merged definition
}

export interface MergeConflict {
  path: string; // JSON path to conflict
  base: any;
  local: any;
  upstream: any;
  resolved?: any;
}
```

#### 3.4.2 Fork Manager

```typescript
// src/definitions/registry/fork/fork-manager.ts
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as semver from 'semver';
import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import type { DefinitionResolver } from '../resolver';
import type { ManifestManager } from '../manifest/manifest-manager';
import type { ForkOptions, MergeOptions, MergeResult } from './types';
import { performMerge } from './merge';
import type { AgentDefinition } from '../../schemas';

export class ForkManager {
  constructor(
    private resolver: DefinitionResolver,
    private manifestManager: ManifestManager
  ) {}

  /**
   * Fork an agent to local registry
   */
  async forkAgent(options: ForkOptions): Promise<void> {
    const { sourceName, targetName, customizations } = options;

    logger.info(`Forking agent: ${sourceName} → ${targetName}`);

    // 1. Resolve source agent
    const source = await this.resolver.resolveAgent(sourceName);

    // 2. Create forked definition
    const forked: AgentDefinition = {
      ...source.definition,
      name: targetName,
      fork_of: {
        name: sourceName,
        version: source.version,
        forked_at: new Date().toISOString(),
      },
      ...customizations,
    };

    // 3. Save to local registry
    const targetPath = path.join(process.cwd(), '.fractary/agents', `${targetName}.yaml`);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, yaml.dump(forked), 'utf-8');

    // 4. Track fork in manifest
    await this.manifestManager.trackFork(sourceName, targetName);

    logger.success(`Forked ${sourceName}@${source.version} → ${targetName}`);
    logger.info(`Edit at: ${targetPath}`);
  }

  /**
   * Check for upstream updates
   */
  async checkUpstreamUpdates(forkedName: string): Promise<{
    hasUpdate: boolean;
    current: string;
    latest: string;
  }> {
    // Load forked agent
    const forkedPath = path.join(process.cwd(), '.fractary/agents', `${forkedName}.yaml`);
    const content = await fs.readFile(forkedPath, 'utf-8');
    const forked = yaml.load(content) as AgentDefinition;

    if (!forked.fork_of) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_INVALID,
        `${forkedName} is not a fork`,
        { name: forkedName }
      );
    }

    // Check upstream for updates
    const upstream = await this.resolver.resolveAgent(forked.fork_of.name);
    const hasUpdate = semver.gt(upstream.version, forked.fork_of.version);

    if (hasUpdate) {
      logger.info(
        `Upstream update available: ${forked.fork_of.version} → ${upstream.version}`
      );
    } else {
      logger.success('Fork is up to date with upstream');
    }

    return {
      hasUpdate,
      current: forked.fork_of.version,
      latest: upstream.version,
    };
  }

  /**
   * Merge upstream changes into fork
   */
  async mergeUpstream(forkedName: string, options: MergeOptions = {}): Promise<MergeResult> {
    logger.info(`Merging upstream changes for: ${forkedName}`);

    // Load forked agent
    const forkedPath = path.join(process.cwd(), '.fractary/agents', `${forkedName}.yaml`);
    const content = await fs.readFile(forkedPath, 'utf-8');
    const forked = yaml.load(content) as AgentDefinition;

    if (!forked.fork_of) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_INVALID,
        `${forkedName} is not a fork`,
        { name: forkedName }
      );
    }

    // Fetch latest upstream
    const upstream = await this.resolver.resolveAgent(forked.fork_of.name);

    // Perform 3-way merge
    const mergeResult = await performMerge({
      base: forked.fork_of, // Original fork point
      local: forked, // Current local version
      upstream: upstream.definition, // Latest upstream
    });

    if (!mergeResult.success && options.strategy === 'auto') {
      logger.error('Merge conflicts detected. Manual resolution required.');
      return mergeResult;
    }

    // Update fork metadata
    mergeResult.merged.fork_of = {
      ...forked.fork_of,
      version: upstream.version,
      merged_at: new Date().toISOString(),
    };

    // Save merged definition
    await fs.writeFile(forkedPath, yaml.dump(mergeResult.merged), 'utf-8');

    logger.success('Upstream changes merged successfully');
    return mergeResult;
  }
}
```

## 4. Integration with Existing Resolver

We need to update the existing `DefinitionResolver` to integrate Stockyard:

```typescript
// src/definitions/registry/resolver.ts (UPDATED)
export class DefinitionResolver {
  private loader = new YAMLLoader();
  private cache = new DefinitionCache();
  private inheritanceResolver: InheritanceResolver;
  private config: RegistryConfig;

  // NEW: Add Stockyard resolver
  private stockyardResolver?: StockyardResolver;

  constructor(config?: Partial<RegistryConfig>) {
    this.config = {
      local: {
        enabled: true,
        paths: ['.fractary/agents', '.fractary/tools'],
      },
      global: {
        enabled: true,
        path: path.join(os.homedir(), '.fractary/registry'),
      },
      stockyard: {
        enabled: false,
      },
      ...config,
    };

    this.inheritanceResolver = new InheritanceResolver(this);

    // NEW: Initialize Stockyard resolver if enabled
    if (this.config.stockyard.enabled && this.config.stockyard.url) {
      const stockyardClient = new StockyardClient({
        url: this.config.stockyard.url,
        apiKey: this.config.stockyard.apiKey,
      });
      const manifestManager = new ManifestManager(this.config.global.path);
      this.stockyardResolver = new StockyardResolver(
        stockyardClient,
        manifestManager,
        this.config.global.path
      );
    }
  }

  async resolveAgent(name: string): Promise<ResolvedAgent> {
    // ... existing local and global checks ...

    // 3. Check Stockyard (UPDATED)
    if (this.config.stockyard.enabled && this.stockyardResolver) {
      logger.debug(`Fetching ${name} from Stockyard`);
      const stockyard = await this.stockyardResolver.resolveAgent(
        parsed.name,
        parsed.versionRange
      );

      if (stockyard) {
        // Resolve inheritance
        stockyard.definition = await this.inheritanceResolver.resolveAgent(
          stockyard.definition
        );

        this.cache.setAgent(name, stockyard);
        return stockyard;
      }
    }

    throw new ForgeError(
      DefinitionErrorCode.AGENT_NOT_FOUND,
      `Agent '${name}' not found in any registry`,
      { name, versionRange: parsed.versionRange }
    );
  }
}
```

## 5. Implementation Phases

### Phase 1: Lockfile & Manifest Foundation (Week 1)

**Days 1-2: Lockfile System**
- [ ] Create `src/definitions/registry/lockfile/` directory
- [ ] Implement `types.ts` - Lockfile interfaces
- [ ] Implement `integrity.ts` - SHA-256 hashing
- [ ] Implement `discovery.ts` - Discover used agents/tools
- [ ] Implement `lockfile-manager.ts` - Generate, load, validate lockfiles
- [ ] Write unit tests for lockfile system
- [ ] Test lockfile generation with sample project

**Days 3-4: Manifest System**
- [ ] Create `src/definitions/registry/manifest/` directory
- [ ] Implement `types.ts` - Manifest interfaces
- [ ] Implement `manifest-manager.ts` - CRUD operations
- [ ] Implement `manifest-sync.ts` - Sync from Stockyard (stub)
- [ ] Write unit tests for manifest system
- [ ] Test manifest creation and updates

**Day 5: Integration Testing**
- [ ] Integration tests for lockfile + manifest
- [ ] Performance testing
- [ ] Documentation updates

### Phase 2: Stockyard Integration (Week 2)

**Days 1-2: Stockyard Client**
- [ ] Create `src/definitions/registry/stockyard/` directory
- [ ] Implement `types.ts` - Stockyard API types
- [ ] Implement `client.ts` - HTTP client with axios
- [ ] Implement `cache.ts` - Stockyard response cache
- [ ] Add `axios` dependency to package.json
- [ ] Write unit tests (with mocked API)

**Days 3-4: Stockyard Resolver**
- [ ] Implement `resolver.ts` - Stockyard resolution logic
- [ ] Update `DefinitionResolver` to integrate Stockyard
- [ ] Implement cache-to-global logic
- [ ] Write integration tests
- [ ] Test with mock Stockyard API

**Day 5: Manifest Sync Integration**
- [ ] Complete `manifest-sync.ts` implementation
- [ ] Connect to Stockyard client
- [ ] Test update notifications
- [ ] Integration testing

### Phase 3: Fork Workflow & Updates (Week 3)

**Days 1-2: Fork Management**
- [ ] Create `src/definitions/registry/fork/` directory
- [ ] Implement `types.ts` - Fork interfaces
- [ ] Implement `fork-manager.ts` - Fork operations
- [ ] Implement `merge.ts` - 3-way merge logic
- [ ] Implement `diff.ts` - Diff utilities
- [ ] Write unit tests

**Days 3-4: Update Management**
- [ ] Create update manager (if needed as separate module)
- [ ] Implement update checking
- [ ] Implement update application
- [ ] Breaking change detection
- [ ] Write unit tests

**Day 5: End-to-End Testing**
- [ ] Complete workflow tests
- [ ] Fork → customize → merge upstream
- [ ] Performance testing
- [ ] Documentation

### Phase 4: CLI Commands (Optional - Week 4 or Separate)

**Days 1-3: Core Commands**
- [ ] Create `src/commands/` directory (if CLI in SDK)
- [ ] Implement `install.ts`
- [ ] Implement `update.ts`
- [ ] Implement `fork.ts`
- [ ] Implement `list.ts`
- [ ] Implement `info.ts`
- [ ] Implement `lock.ts`

**Days 4-5: Polish & Documentation**
- [ ] Command help text
- [ ] Error handling
- [ ] User-friendly output
- [ ] CLI documentation
- [ ] Examples

## 6. Testing Strategy

### 6.1 Unit Tests

```
src/definitions/registry/lockfile/__tests__/
├── lockfile-manager.test.ts
├── integrity.test.ts
└── discovery.test.ts

src/definitions/registry/manifest/__tests__/
├── manifest-manager.test.ts
└── manifest-sync.test.ts

src/definitions/registry/stockyard/__tests__/
├── client.test.ts (with axios-mock-adapter)
├── resolver.test.ts
└── cache.test.ts

src/definitions/registry/fork/__tests__/
├── fork-manager.test.ts
└── merge.test.ts
```

### 6.2 Integration Tests

```typescript
// src/definitions/__tests__/integration/registry-flow.test.ts
describe('Complete Registry Flow', () => {
  it('should resolve → generate lockfile → check updates → fork → merge', async () => {
    // 1. Resolve agent from global
    const agent = await resolver.resolveAgent('test-agent@^1.0.0');
    expect(agent.version).toMatch(/^1\./);

    // 2. Generate lockfile
    const lockfile = await lockfileManager.generate();
    expect(lockfile.agents['test-agent']).toBeDefined();

    // 3. Check for updates
    const updates = await updateManager.checkUpdates();
    expect(updates.total).toBeGreaterThanOrEqual(0);

    // 4. Fork agent
    await forkManager.forkAgent({
      sourceName: 'test-agent',
      targetName: 'my-test-agent',
    });

    // 5. Check upstream updates
    const upstreamCheck = await forkManager.checkUpstreamUpdates('my-test-agent');
    expect(upstreamCheck).toBeDefined();
  });
});
```

## 7. Dependencies

### 7.1 New Dependencies

```json
{
  "dependencies": {
    "axios": "^1.6.0"  // For Stockyard HTTP client
  },
  "devDependencies": {
    "@types/axios": "^0.14.0",
    "axios-mock-adapter": "^1.22.0"  // For testing
  }
}
```

All other dependencies (semver, js-yaml, fs-extra, glob) are already included from Phase 1.

## 8. Configuration Updates

Update `ForgeConfig` to support registry configuration:

```typescript
// src/types/config.ts (EXTEND)
export interface ForgeConfig {
  // ... existing fields ...

  definitions?: {
    registry?: {
      local?: {
        enabled: boolean;
        paths: string[];
      };
      global?: {
        enabled: boolean;
        path: string;
      };
      stockyard?: {
        enabled: boolean;
        url?: string;
        apiKey?: string;
        timeout?: number;
      };
    };
    lockfile?: {
      autoGenerate?: boolean; // Auto-generate on install
      validateOnLoad?: boolean; // Validate integrity on load
    };
    manifest?: {
      syncInterval?: number; // Auto-sync interval in ms
      checkUpdatesOnStart?: boolean; // Check updates on SDK init
    };
  };
}
```

## 9. Success Criteria

### Functional Requirements
- [ ] Lockfile system generates, loads, and validates lockfiles
- [ ] Lockfile pins exact versions with integrity hashes
- [ ] Manifest system tracks package metadata and versions
- [ ] Manifest sync updates from Stockyard API
- [ ] Stockyard client fetches definitions and metadata
- [ ] Stockyard resolver integrates with 3-tier resolution
- [ ] Fork manager creates, tracks, and merges forks
- [ ] Update notifications detect available updates
- [ ] Dependency resolution builds complete dependency trees
- [ ] All systems integrate with existing Phase 1 infrastructure

### Non-Functional Requirements
- [ ] Lockfile generation < 5s for typical project (10-20 agents)
- [ ] Manifest sync < 3s (parallel fetches)
- [ ] Stockyard resolution < 2s (network call)
- [ ] Unit test coverage > 90%
- [ ] Integration test coverage for all workflows
- [ ] Backward compatible with Phase 1

### Documentation Requirements
- [ ] API documentation for all new classes
- [ ] Usage examples for lockfile, manifest, fork workflows
- [ ] Migration guide (if any breaking changes)
- [ ] CLI documentation (if commands implemented)
- [ ] Configuration reference

## 10. Open Questions

### Resolved
- **Lockfile location**: `.fractary/plugins/forge/lockfile.json` ✓
- **Manifest location**: `~/.fractary/registry/manifests/*.json` ✓
- **Integrity algorithm**: SHA-256 ✓
- **Stockyard API format**: RESTful JSON API ✓

### Pending
1. **CLI Location**: Should CLI commands be in SDK or separate `@fractary/forge-cli` package?
   - **Recommendation**: Keep in SDK for now, extract later if needed
2. **Stockyard URL**: What's the production Stockyard URL?
   - **Default**: `https://stockyard.fractary.dev` (configurable)
3. **Merge Strategy**: How to handle complex merge conflicts?
   - **Recommendation**: Start with simple field-level merging, expand as needed
4. **Circular Dependencies**: How to prevent agent A depending on agent B depending on agent A?
   - **Recommendation**: Implement cycle detection in dependency resolver
5. **Private Stockyard**: Support for private/enterprise Stockyard instances?
   - **Recommendation**: Support via `apiKey` configuration (Phase 3+)

## 11. Risk Mitigation

### Risk: Stockyard API Changes
- **Mitigation**: Abstract API behind client interface, version API endpoints
- **Fallback**: Graceful degradation to local/global registries

### Risk: Lockfile Corruption
- **Mitigation**: Validate on load, backup before regeneration
- **Recovery**: Regenerate from current state

### Risk: Merge Conflicts
- **Mitigation**: Clear conflict reporting, manual resolution workflow
- **Fallback**: Keep pre-merge backup

### Risk: Network Failures
- **Mitigation**: Timeouts, retries, offline mode
- **Fallback**: Use cached/global registry

## 12. Related Specifications

- **SPEC-FORGE-001**: Agent & Tool Definition System (Parent)
- **SPEC-FORGE-001-IMPLEMENTATION**: Phase 1 Implementation (Completed)
- **SPEC-FORGE-002**: Agent Registry & Resolution (Parent)
- **SPEC-FABER-002**: FABER Integration Interface

---

**Ready for implementation. Proceed with Phase 1.**

---

## 8. Refinement Round 1: Implementation Updates

This section documents implementation updates based on spec refinement decisions.

### 8.1 Circular Dependency Detection

Add cycle detection to the dependency resolver:

```typescript
// src/definitions/registry/dependency/cycle-detector.ts
export class CycleDetector {
  /**
   * Detect circular dependencies in a dependency graph
   * Uses Tarjan's algorithm for cycle detection
   */
  detectCycles(graph: DependencyGraph): Cycle[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const cycles: Cycle[] = [];

    const dfs = (node: string, path: string[]): void => {
      if (visiting.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        cycles.push({
          nodes: path.slice(cycleStart),
          description: path.slice(cycleStart).concat(node).join(' -> '),
        });
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visiting.add(node);
      path.push(node);

      for (const dep of graph.getDependencies(node)) {
        dfs(dep, [...path]);
      }

      visiting.delete(node);
      visited.add(node);
    };

    for (const node of graph.getNodes()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }
}

export interface Cycle {
  nodes: string[];
  description: string;
}
```

**Error Class**:

```typescript
// src/definitions/errors/circular-dependency.ts
export class CircularDependencyError extends ForgeError {
  constructor(chain: string[]) {
    const chainStr = chain.join(' -> ');
    super(
      DefinitionErrorCode.CIRCULAR_DEPENDENCY,
      `Circular dependency detected!\n\n` +
      `Dependency chain:\n  ${chainStr}\n\n` +
      `The agent '${chain[chain.length - 1]}' depends on itself through this chain.\n` +
      `Please remove the circular reference to resolve this issue.`,
      { chain }
    );
  }
}
```

### 8.2 Offline Cache Miss Handling

Update the lockfile resolver for fail-fast behavior:

```typescript
// src/definitions/registry/lockfile/lockfile-resolver.ts
export class LockfileResolver {
  async resolveFromLockfile(
    name: string,
    options: { offline?: boolean } = {}
  ): Promise<ResolvedDefinition> {
    const lockfile = await this.lockfileManager.load();
    const entry = lockfile.agents[name] || lockfile.tools[name];

    if (!entry) {
      throw new LockfileError(
        `'${name}' not found in lockfile. Run 'forge lock' to regenerate.`
      );
    }

    // Check cache based on resolution source
    if (entry.resolved === 'global' || entry.resolved === 'stockyard') {
      const cached = await this.checkGlobalCache(name, entry.version);

      if (!cached) {
        throw new CacheMissError(
          `${entry.resolved === 'stockyard' ? 'Agent' : 'Package'} '${name}@${entry.version}' not found in global cache.\n` +
          `The lockfile references this version but it is not installed locally.\n\n` +
          `To fix this, run:\n` +
          `  forge install\n\n` +
          `This will download all locked versions to your global cache.`
        );
      }

      return cached;
    }

    // Local resolution
    return this.resolveLocal(name, entry);
  }
}
```

**Error Class**:

```typescript
// src/definitions/errors/cache-miss.ts
export class CacheMissError extends ForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(DefinitionErrorCode.CACHE_MISS, message, details);
  }
}
```

### 8.3 Interactive Conflict Resolution

Implement the conflict resolver for fork merges:

```typescript
// src/definitions/fork/conflict-resolver.ts
import * as readline from 'readline';
import * as yaml from 'yaml';
import { logger } from '../../logger';

export interface MergeConflict {
  path: string;
  local: unknown;
  upstream: unknown;
  base?: unknown;
}

export interface MergeResult {
  merged: Record<string, unknown>;
  conflicts: MergeConflict[];
  autoResolved: string[];
}

export class ConflictResolver {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async resolveInteractively(mergeResult: MergeResult): Promise<Record<string, unknown>> {
    if (mergeResult.conflicts.length === 0) {
      logger.info('No conflicts - merge completed automatically');
      return mergeResult.merged;
    }

    logger.info(`\nFound ${mergeResult.conflicts.length} conflict(s) requiring resolution:\n`);

    const resolved = { ...mergeResult.merged };

    for (let i = 0; i < mergeResult.conflicts.length; i++) {
      const conflict = mergeResult.conflicts[i];
      await this.resolveConflict(conflict, resolved, i + 1, mergeResult.conflicts.length);
    }

    // Show final result
    console.log('\n' + '='.repeat(60));
    console.log('MERGE COMPLETE - Final Definition:');
    console.log('='.repeat(60) + '\n');
    console.log(yaml.stringify(resolved));

    const confirmed = await this.confirm('Save merged definition?');
    if (!confirmed) {
      throw new MergeAbortedError('Merge cancelled by user');
    }

    return resolved;
  }

  private async resolveConflict(
    conflict: MergeConflict,
    resolved: Record<string, unknown>,
    current: number,
    total: number
  ): Promise<void> {
    console.log(`\n[${ current }/${ total }] Conflict in: ${conflict.path}`);
    console.log('-'.repeat(50));
    console.log('<<<<<<< LOCAL (your changes)');
    console.log(this.formatValue(conflict.local));
    console.log('=======');
    console.log(this.formatValue(conflict.upstream));
    console.log('>>>>>>> UPSTREAM');
    console.log('-'.repeat(50));

    const choice = await this.prompt(
      '\nResolve: [l]ocal, [u]pstream, [b]oth, [e]dit? '
    );

    switch (choice.toLowerCase()) {
      case 'l':
        this.setAtPath(resolved, conflict.path, conflict.local);
        logger.info('Keeping local version');
        break;
      case 'u':
        this.setAtPath(resolved, conflict.path, conflict.upstream);
        logger.info('Keeping upstream version');
        break;
      case 'b':
        const merged = this.mergeBoth(conflict.local, conflict.upstream);
        this.setAtPath(resolved, conflict.path, merged);
        logger.info('Merged both versions');
        break;
      case 'e':
        const edited = await this.editManually(conflict);
        this.setAtPath(resolved, conflict.path, edited);
        logger.info('Applied manual edit');
        break;
      default:
        logger.warn('Invalid choice, keeping local version');
        this.setAtPath(resolved, conflict.path, conflict.local);
    }
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'object' && value !== null) {
      return yaml.stringify(value).trim();
    }
    return String(value);
  }

  private mergeBoth(local: unknown, upstream: unknown): unknown {
    if (Array.isArray(local) && Array.isArray(upstream)) {
      return [...local, ...upstream.filter(item => !local.includes(item))];
    }
    if (typeof local === 'object' && typeof upstream === 'object') {
      return { ...local as object, ...upstream as object };
    }
    // For primitives, prefer local
    return local;
  }

  private setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: any = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  private confirm(question: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.rl.question(`${question} [y/N] `, (answer) => {
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }

  private async editManually(conflict: MergeConflict): Promise<unknown> {
    // In a real implementation, this would open $EDITOR
    // For now, prompt for YAML input
    console.log('\nEnter new value (YAML format, empty line to finish):');
    const lines: string[] = [];
    let line = await this.prompt('> ');
    while (line !== '') {
      lines.push(line);
      line = await this.prompt('> ');
    }
    return yaml.parse(lines.join('\n'));
  }

  close(): void {
    this.rl.close();
  }
}
```

### 8.4 Local Agent Version Validation

Update the YAML loader to require version field for local agents:

```typescript
// src/definitions/loaders/yaml-loader.ts (update)
export class YamlLoader {
  async loadLocalAgent(name: string): Promise<AgentDefinition> {
    const localPath = path.join(
      process.cwd(),
      '.fractary/agents',
      `${name}.yaml`
    );

    if (!(await fs.pathExists(localPath))) {
      throw new AgentNotFoundError(`Local agent '${name}' not found at ${localPath}`);
    }

    const content = await fs.readFile(localPath, 'utf-8');
    const definition = yaml.parse(content) as AgentDefinition;

    // Validate required version field for local agents
    if (!definition.version) {
      throw new ValidationError(
        `Local agent '${name}' missing required 'version' field.\n\n` +
        `Add a version to ${localPath}:\n\n` +
        `  name: ${name}\n` +
        `  version: 1.0.0  # <-- Add this\n` +
        `  description: ...\n`
      );
    }

    // Validate semver format
    if (!semver.valid(definition.version)) {
      throw new ValidationError(
        `Local agent '${name}' has invalid version '${definition.version}'.\n` +
        `Version must follow semantic versioning (e.g., 1.0.0, 2.1.3-beta.1).`
      );
    }

    return definition;
  }
}
```

### 8.5 Stockyard Authentication Implementation

Add authentication manager:

```typescript
// src/definitions/registry/stockyard/auth.ts
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { logger } from '../../../logger';

export interface StockyardAuth {
  token?: string;
  tokenSource?: 'env' | 'config' | 'keychain';
  user?: {
    username: string;
    email: string;
  };
}

export class StockyardAuthManager {
  private configPath: string;
  private stockyardUrl: string;

  constructor(stockyardUrl: string = 'https://stockyard.fractary.dev') {
    this.configPath = path.join(os.homedir(), '.fractary/config/forge.json');
    this.stockyardUrl = stockyardUrl;
  }

  /**
   * Resolve authentication from available sources
   */
  async resolveAuth(): Promise<StockyardAuth> {
    // 1. Environment variable (highest priority, for CI/CD)
    const envToken = process.env.STOCKYARD_TOKEN;
    if (envToken) {
      logger.debug('Using token from STOCKYARD_TOKEN environment variable');
      return { token: envToken, tokenSource: 'env' };
    }

    // 2. Config file
    if (await fs.pathExists(this.configPath)) {
      try {
        const config = JSON.parse(await fs.readFile(this.configPath, 'utf-8'));
        if (config.stockyard?.token) {
          logger.debug('Using token from config file');
          return { token: config.stockyard.token, tokenSource: 'config' };
        }
      } catch (error) {
        logger.warn(`Failed to read config: ${error.message}`);
      }
    }

    // 3. System keychain (optional, platform-specific)
    try {
      const keytar = await this.loadKeytar();
      if (keytar) {
        const token = await keytar.getPassword('fractary-stockyard', 'token');
        if (token) {
          logger.debug('Using token from system keychain');
          return { token, tokenSource: 'keychain' };
        }
      }
    } catch {
      // Keychain not available
    }

    // No authentication - anonymous access
    logger.debug('No authentication found - using anonymous access');
    return {};
  }

  /**
   * Store token in config file
   */
  async storeToken(token: string): Promise<void> {
    await fs.ensureDir(path.dirname(this.configPath));

    let config: Record<string, unknown> = {};
    if (await fs.pathExists(this.configPath)) {
      try {
        config = JSON.parse(await fs.readFile(this.configPath, 'utf-8'));
      } catch {
        // Ignore parse errors, start fresh
      }
    }

    config.stockyard = { ...config.stockyard as object, token };
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Set restrictive permissions (owner read/write only)
    await fs.chmod(this.configPath, 0o600);

    logger.debug('Token stored in config file');
  }

  /**
   * Remove stored token
   */
  async clearToken(): Promise<void> {
    if (await fs.pathExists(this.configPath)) {
      const config = JSON.parse(await fs.readFile(this.configPath, 'utf-8'));
      if (config.stockyard) {
        delete config.stockyard.token;
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      }
    }

    // Also clear from keychain
    try {
      const keytar = await this.loadKeytar();
      if (keytar) {
        await keytar.deletePassword('fractary-stockyard', 'token');
      }
    } catch {
      // Ignore keychain errors
    }

    logger.info('Token cleared');
  }

  /**
   * Validate a token against Stockyard API
   */
  async validateToken(token: string): Promise<{ valid: boolean; user?: { username: string; email: string } }> {
    try {
      const response = await axios.get(`${this.stockyardUrl}/api/v1/user`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      return {
        valid: true,
        user: {
          username: response.data.username,
          email: response.data.email,
        },
      };
    } catch (error) {
      if (error.response?.status === 401) {
        return { valid: false };
      }
      throw error;
    }
  }

  /**
   * Get current user info
   */
  async whoami(): Promise<{ authenticated: boolean; user?: { username: string; email: string }; source?: string }> {
    const auth = await this.resolveAuth();

    if (!auth.token) {
      return { authenticated: false };
    }

    const validation = await this.validateToken(auth.token);

    return {
      authenticated: validation.valid,
      user: validation.user,
      source: auth.tokenSource,
    };
  }

  private async loadKeytar(): Promise<typeof import('keytar') | null> {
    try {
      return await import('keytar');
    } catch {
      return null;
    }
  }
}
```

**CLI Commands**:

```typescript
// src/commands/auth.ts
import * as readline from 'readline';
import { StockyardAuthManager } from '../definitions/registry/stockyard/auth';
import { logger } from '../logger';

export async function loginCommand(): Promise<void> {
  const authManager = new StockyardAuthManager();

  console.log('\nLogin to Stockyard');
  console.log('==================\n');
  console.log('1. Visit: https://stockyard.fractary.dev/settings/tokens');
  console.log('2. Generate a new personal access token');
  console.log('3. Paste the token below\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const token = await new Promise<string>((resolve) => {
    rl.question('Token: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!token) {
    logger.error('No token provided');
    return;
  }

  logger.info('Validating token...');
  const validation = await authManager.validateToken(token);

  if (!validation.valid) {
    logger.error('Invalid token. Please check and try again.');
    return;
  }

  await authManager.storeToken(token);
  logger.success(`Logged in as ${validation.user?.username}`);
}

export async function logoutCommand(): Promise<void> {
  const authManager = new StockyardAuthManager();
  await authManager.clearToken();
  logger.success('Logged out from Stockyard');
}

export async function whoamiCommand(): Promise<void> {
  const authManager = new StockyardAuthManager();
  const result = await authManager.whoami();

  if (!result.authenticated) {
    console.log('Not logged in');
    console.log('Run `forge login` to authenticate with Stockyard');
    return;
  }

  console.log(`Logged in as: ${result.user?.username}`);
  console.log(`Email: ${result.user?.email}`);
  console.log(`Token source: ${result.source}`);
}
```

---

## Changelog

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-12-14 | 1.0.0 | Implementation Team | Initial implementation specification |
| 2025-12-14 | 1.1.0 | Claude | Refinement round 1: Added implementation for circular dependency detection, cache miss handling, interactive conflict resolution, local version validation, and Stockyard authentication |
