# SPEC-FORGE-005: Registry Manifest System

**Status:** Draft
**Created:** 2025-12-15
**Author:** Fractary Team
**Related Work:** WORK-00006 (Phase 3B), SPEC-FORGE-003 (Stockyard Integration)

## 1. Overview

This specification defines a **manifest-based registry system** for distributing Forge agents and tools. Inspired by Claude Code's plugin marketplace architecture, this system provides immediate distribution capabilities while serving as a migration path to the full Stockyard API (Phase 3C).

### 1.1 Purpose

- Enable distribution of FABER agents and tools before Stockyard API is ready
- Support organization-specific registries alongside official Fractary registry
- Provide Git-based distribution leveraging familiar workflows
- Establish resolution algorithm for three-tier architecture (local → global → remote)

### 1.2 Scope

**In Scope:**
- Registry manifest JSON format
- Manifest-based registry resolver implementation
- CLI commands for registry management (`forge registry`)
- CLI commands for package installation (`forge install`)
- Resolution algorithm with priority-based querying
- Registry caching and freshness checks
- Migration path to Stockyard API

**Out of Scope:**
- Full Stockyard API implementation (see SPEC-FORGE-003)
- Agent/tool YAML file format (see SPEC-FORGE-005)
- Authentication/authorization (deferred to Stockyard phase)
- Package signing/verification (future enhancement)

## 2. Architecture

### 2.1 Three-Tier Resolution System

```
┌─────────────────────────────────────────────┐
│  Resolution Priority Order                  │
├─────────────────────────────────────────────┤
│  1. Local Project    (.fractary/)           │
│  2. Global User      (~/.fractary/registry/)│
│  3. Remote Registries (manifests or API)    │
└─────────────────────────────────────────────┘
```

### 2.2 Registry Types

| Type | Description | Example | Phase |
|------|-------------|---------|-------|
| **manifest** | Git-hosted JSON manifest | `github.com/fractary/forge-registry` | Phase 3B |
| **stockyard** | Full API with auth, versioning | `api.fractary.com/v1` | Phase 3C |

### 2.3 Directory Structure

```
Project-local:
.fractary/
├── agents/           # User-created or installed agents
├── tools/            # User-created or installed tools
└── config.json       # Registry configuration

Global user:
~/.fractary/
├── registry/
│   ├── agents/       # Globally installed agents
│   ├── tools/        # Globally installed tools
│   └── cache/        # Downloaded manifests
└── config.json       # Global registry configuration
```

## 3. Manifest Format

### 3.1 Registry Manifest Schema

**File:** `manifest.json`

```json
{
  "$schema": "https://fractary.com/schemas/registry-manifest-v1.json",
  "name": "fractary-core",
  "version": "1.0.0",
  "description": "Official Fractary agent and tool registry",
  "updated": "2025-12-15T00:00:00Z",
  "packages": [
    {
      "name": "@fractary/faber-agents",
      "version": "2.0.0",
      "description": "FABER workflow methodology agents",
      "type": "agent-collection",
      "homepage": "https://github.com/fractary/faber",
      "repository": "https://github.com/fractary/forge-registry",
      "license": "MIT",
      "agents": [
        {
          "name": "frame-agent",
          "version": "2.0.0",
          "description": "FABER Frame phase - requirements gathering",
          "source": "https://raw.githubusercontent.com/fractary/forge-registry/main/agents/frame-agent@2.0.0.yaml",
          "checksum": "sha256:abc123...",
          "size": 4096,
          "dependencies": ["fetch_issue", "classify_work_type"]
        },
        {
          "name": "architect-agent",
          "version": "2.0.0",
          "description": "FABER Architect phase - solution design",
          "source": "https://raw.githubusercontent.com/fractary/forge-registry/main/agents/architect-agent@2.0.0.yaml",
          "checksum": "sha256:def456...",
          "size": 5120,
          "dependencies": ["create_specification", "fetch_codex_docs"]
        }
      ],
      "tools": [
        {
          "name": "fetch_issue",
          "version": "2.0.0",
          "description": "Fetch work item details from tracking systems",
          "source": "https://raw.githubusercontent.com/fractary/forge-registry/main/tools/fetch_issue@2.0.0.yaml",
          "checksum": "sha256:ghi789...",
          "size": 2048
        }
      ],
      "tags": ["faber", "workflow", "official"]
    },
    {
      "name": "@acme/custom-agents",
      "version": "1.0.0",
      "description": "ACME Corp custom workflow agents",
      "type": "agent-collection",
      "homepage": "https://github.com/acme-corp/forge-agents",
      "repository": "https://github.com/acme-corp/forge-agents",
      "license": "Proprietary",
      "agents": [...],
      "tools": [...],
      "tags": ["custom", "acme"]
    }
  ]
}
```

### 3.2 Manifest Schema Validation

**Zod Schema:** `src/registry/schemas/manifest.ts`

```typescript
import { z } from 'zod';

export const RegistryItemSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  source: z.string().url(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  size: z.number().min(1),
  dependencies: z.array(z.string()).optional(),
});

export const RegistryPackageSchema = z.object({
  name: z.string().regex(/^@[a-z0-9-]+\/[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  type: z.enum(['agent-collection', 'tool-collection', 'mixed']),
  homepage: z.string().url().optional(),
  repository: z.string().url(),
  license: z.string(),
  agents: z.array(RegistryItemSchema).optional(),
  tools: z.array(RegistryItemSchema).optional(),
  tags: z.array(z.string()),
});

export const RegistryManifestSchema = z.object({
  $schema: z.string().url().optional(),
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  updated: z.string().datetime(),
  packages: z.array(RegistryPackageSchema),
});

export type RegistryItem = z.infer<typeof RegistryItemSchema>;
export type RegistryPackage = z.infer<typeof RegistryPackageSchema>;
export type RegistryManifest = z.infer<typeof RegistryManifestSchema>;
```

## 4. Configuration

### 4.1 Registry Configuration Schema

**File:** `.fractary/config.json` or `~/.fractary/config.json`

```json
{
  "registries": [
    {
      "name": "fractary-core",
      "type": "manifest",
      "url": "https://raw.githubusercontent.com/fractary/forge-registry/main/manifest.json",
      "enabled": true,
      "priority": 1,
      "cache_ttl": 3600
    },
    {
      "name": "acme-internal",
      "type": "manifest",
      "url": "https://raw.githubusercontent.com/acme-corp/forge-registry/main/manifest.json",
      "enabled": true,
      "priority": 2,
      "cache_ttl": 1800
    },
    {
      "name": "stockyard-production",
      "type": "stockyard",
      "url": "https://api.fractary.com/v1",
      "enabled": false,
      "priority": 3,
      "auth": {
        "type": "bearer",
        "token_env": "FRACTARY_API_TOKEN"
      }
    }
  ],
  "install": {
    "default_scope": "global",
    "verify_checksums": true,
    "auto_install_dependencies": true
  }
}
```

### 4.2 Configuration Schema Validation

```typescript
export const RegistryConfigSchema = z.object({
  name: z.string(),
  type: z.enum(['manifest', 'stockyard']),
  url: z.string().url(),
  enabled: z.boolean(),
  priority: z.number().min(1),
  cache_ttl: z.number().min(0).optional(),
  auth: z.object({
    type: z.enum(['bearer', 'apikey']),
    token_env: z.string(),
  }).optional(),
});

export const ForgeConfigSchema = z.object({
  registries: z.array(RegistryConfigSchema),
  install: z.object({
    default_scope: z.enum(['global', 'local']),
    verify_checksums: z.boolean(),
    auto_install_dependencies: z.boolean(),
  }).optional(),
});
```

## 5. CLI Commands

### 5.1 Registry Management

#### `forge registry add`

Add a new registry to configuration.

```bash
# Add manifest-based registry
forge registry add fractary-core \
  --type manifest \
  --url https://raw.githubusercontent.com/fractary/forge-registry/main/manifest.json \
  --priority 1

# Add Stockyard API registry (future)
forge registry add stockyard \
  --type stockyard \
  --url https://api.fractary.com/v1 \
  --auth-token-env FRACTARY_API_TOKEN
```

**Options:**
- `<name>`: Registry identifier
- `--type <manifest|stockyard>`: Registry type
- `--url <url>`: Registry URL
- `--priority <n>`: Query priority (lower = higher priority)
- `--cache-ttl <seconds>`: Cache TTL (default: 3600)
- `--auth-token-env <var>`: Environment variable for auth token
- `--global`: Add to global config (~/.fractary/config.json)
- `--local`: Add to project config (.fractary/config.json) [default]

#### `forge registry list`

List configured registries.

```bash
forge registry list

# Output:
# NAME              TYPE       URL                                    ENABLED  PRIORITY
# fractary-core     manifest   https://raw.githubusercontent.com/...  ✓        1
# acme-internal     manifest   https://raw.githubusercontent.com/...  ✓        2
# stockyard         stockyard  https://api.fractary.com/v1            ✗        3
```

**Options:**
- `--global`: Show global registries only
- `--local`: Show project registries only
- `--all`: Show both global and local [default]
- `--enabled`: Show only enabled registries

#### `forge registry remove`

Remove a registry from configuration.

```bash
forge registry remove fractary-core

# Options:
# --global: Remove from global config
# --local: Remove from project config [default]
```

#### `forge registry update`

Update a registry's configuration.

```bash
forge registry update fractary-core --priority 2 --enabled false
```

#### `forge registry refresh`

Force refresh of manifest cache.

```bash
forge registry refresh [registry-name]

# Examples:
forge registry refresh                  # Refresh all registries
forge registry refresh fractary-core    # Refresh specific registry
```

### 5.2 Package Installation

#### `forge install`

Install agents and tools from registries.

```bash
# Install a package (installs all agents and tools in package)
forge install @fractary/faber-agents

# Install specific agent
forge install @fractary/faber-agents/frame-agent

# Install specific tool
forge install @fractary/faber-agents/fetch_issue

# Install multiple items
forge install @fractary/faber-agents/frame-agent @fractary/faber-agents/architect-agent

# Install with version constraint
forge install @fractary/faber-agents@2.0.0
```

**Options:**
- `--global`: Install to ~/.fractary/registry/ [default]
- `--local`: Install to .fractary/
- `--registry <name>`: Install from specific registry
- `--no-deps`: Skip dependency installation
- `--force`: Overwrite existing files
- `--dry-run`: Show what would be installed without installing

**Output:**
```
Installing @fractary/faber-agents@2.0.0...
  ✓ Resolved from registry: fractary-core
  ✓ Downloaded frame-agent@2.0.0 (4.0 KB)
  ✓ Verified checksum: sha256:abc123...
  ✓ Installed to: ~/.fractary/registry/agents/frame-agent@2.0.0.yaml
  ✓ Downloaded architect-agent@2.0.0 (5.0 KB)
  ✓ Verified checksum: sha256:def456...
  ✓ Installed to: ~/.fractary/registry/agents/architect-agent@2.0.0.yaml

Installing dependencies...
  ✓ fetch_issue@2.0.0
  ✓ classify_work_type@2.0.0

Successfully installed @fractary/faber-agents@2.0.0 (2 agents, 12 tools)
```

#### `forge list`

List installed agents and tools.

```bash
forge list

# Output:
# TYPE   NAME               VERSION  LOCATION
# agent  frame-agent        2.0.0    ~/.fractary/registry/agents/
# agent  architect-agent    2.0.0    ~/.fractary/registry/agents/
# tool   fetch_issue        2.0.0    ~/.fractary/registry/tools/
```

**Options:**
- `--type <agent|tool>`: Filter by type
- `--global`: Show global installations only
- `--local`: Show local installations only
- `--all`: Show both global and local [default]

#### `forge uninstall`

Uninstall agents and tools.

```bash
forge uninstall @fractary/faber-agents/frame-agent

# Options:
# --global: Uninstall from global location
# --local: Uninstall from local location
```

#### `forge search`

Search for packages in registries.

```bash
forge search faber

# Output:
# NAME                      VERSION  DESCRIPTION                           REGISTRY
# @fractary/faber-agents    2.0.0    FABER workflow methodology agents     fractary-core
# @acme/faber-extensions    1.0.0    Custom FABER extensions               acme-internal
```

**Options:**
- `--type <agent|tool>`: Filter by type
- `--registry <name>`: Search specific registry only
- `--tag <tag>`: Filter by tag

## 6. Resolution Algorithm

### 6.1 Agent/Tool Resolution Flow

```typescript
/**
 * Resolution algorithm for finding agents and tools
 */
async function resolveAgent(name: string): Promise<AgentDefinition> {
  // 1. Check local project first (.fractary/agents/)
  const localPath = path.join(process.cwd(), '.fractary', 'agents', `${name}.yaml`);
  if (await fs.pathExists(localPath)) {
    return loadAgentDefinition(localPath);
  }

  // 2. Check global user registry (~/.fractary/registry/agents/)
  const globalPath = path.join(os.homedir(), '.fractary', 'registry', 'agents', `${name}.yaml`);
  if (await fs.pathExists(globalPath)) {
    return loadAgentDefinition(globalPath);
  }

  // 3. Query remote registries in priority order
  const registries = await loadRegistryConfig();
  const enabledRegistries = registries
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const registry of enabledRegistries) {
    const agent = await queryRegistry(registry, 'agent', name);
    if (agent) {
      // Optionally cache to global registry
      if (config.install.auto_cache) {
        await downloadAndCache(agent, 'global');
      }
      return agent;
    }
  }

  throw new Error(`Agent not found: ${name}`);
}
```

### 6.2 Version Resolution

```typescript
/**
 * Resolve version constraints using semver
 */
function resolveVersion(
  available: string[],
  constraint: string = '*'
): string | null {
  // Use semver library to find best match
  return semver.maxSatisfying(available, constraint);
}

// Examples:
// resolveVersion(['1.0.0', '1.1.0', '2.0.0'], '^1.0.0')  → '1.1.0'
// resolveVersion(['1.0.0', '1.1.0', '2.0.0'], '~1.0.0')  → '1.0.0'
// resolveVersion(['1.0.0', '1.1.0', '2.0.0'], '*')       → '2.0.0'
```

### 6.3 Dependency Resolution

```typescript
/**
 * Recursively resolve and install dependencies
 */
async function installWithDependencies(
  item: RegistryItem,
  options: InstallOptions
): Promise<void> {
  const installed = new Set<string>();
  const queue = [item];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.name}@${current.version}`;

    if (installed.has(key)) continue;

    // Install current item
    await downloadAndInstall(current, options);
    installed.add(key);

    // Add dependencies to queue
    if (current.dependencies && options.auto_install_dependencies) {
      for (const depName of current.dependencies) {
        const dep = await resolveItem(depName);
        queue.push(dep);
      }
    }
  }
}
```

## 7. Caching Strategy

### 7.1 Manifest Caching

```typescript
interface ManifestCache {
  url: string;
  manifest: RegistryManifest;
  fetched_at: number;
  ttl: number;
}

async function fetchManifest(
  registry: RegistryConfig,
  force: boolean = false
): Promise<RegistryManifest> {
  const cachePath = path.join(
    os.homedir(),
    '.fractary',
    'registry',
    'cache',
    `${registry.name}.json`
  );

  // Check cache freshness
  if (!force && await fs.pathExists(cachePath)) {
    const cache: ManifestCache = await fs.readJson(cachePath);
    const age = Date.now() - cache.fetched_at;

    if (age < (registry.cache_ttl || 3600) * 1000) {
      return cache.manifest;
    }
  }

  // Fetch fresh manifest
  const response = await fetch(registry.url);
  const manifest = RegistryManifestSchema.parse(await response.json());

  // Update cache
  await fs.outputJson(cachePath, {
    url: registry.url,
    manifest,
    fetched_at: Date.now(),
    ttl: registry.cache_ttl || 3600,
  });

  return manifest;
}
```

### 7.2 Downloaded Asset Caching

- Agents and tools downloaded via `forge install` are cached in:
  - Global: `~/.fractary/registry/agents/` and `~/.fractary/registry/tools/`
  - Local: `.fractary/agents/` and `.fractary/tools/`
- Checksums are verified on download
- Assets are versioned: `frame-agent@2.0.0.yaml`

## 8. Implementation Tasks

### 8.1 Phase 1: Core Infrastructure (Week 1)

**Files to create:**

1. `src/registry/schemas/manifest.ts`
   - Registry manifest Zod schemas
   - Configuration schemas

2. `src/registry/schemas/config.ts`
   - Forge configuration schemas

3. `src/registry/resolvers/manifest-resolver.ts`
   - Manifest fetching and caching
   - Package/agent/tool resolution

4. `src/registry/resolvers/local-resolver.ts`
   - Local file system resolution
   - Global registry resolution

5. `src/registry/cache.ts`
   - Manifest caching logic
   - TTL and freshness checks

6. `src/registry/types.ts`
   - TypeScript interfaces

### 8.2 Phase 2: CLI Commands (Week 1-2)

**Files to create:**

1. `src/cli/commands/registry/add.ts`
2. `src/cli/commands/registry/list.ts`
3. `src/cli/commands/registry/remove.ts`
4. `src/cli/commands/registry/update.ts`
5. `src/cli/commands/registry/refresh.ts`
6. `src/cli/commands/install.ts`
7. `src/cli/commands/uninstall.ts`
8. `src/cli/commands/list.ts`
9. `src/cli/commands/search.ts`

### 8.3 Phase 3: Resolution & Installation (Week 2)

**Files to create:**

1. `src/registry/resolver.ts`
   - Main resolution algorithm
   - Three-tier priority resolution

2. `src/registry/installer.ts`
   - Package download
   - Checksum verification
   - Dependency resolution

3. `src/registry/config-manager.ts`
   - Load/save configuration
   - Merge global and local configs

### 8.4 Phase 4: Testing (Week 2-3)

**Test files:**

1. `tests/unit/registry/manifest-resolver.test.ts`
2. `tests/unit/registry/local-resolver.test.ts`
3. `tests/unit/registry/cache.test.ts`
4. `tests/unit/registry/resolver.test.ts`
5. `tests/unit/registry/installer.test.ts`
6. `tests/integration/cli/registry-commands.test.ts`
7. `tests/integration/cli/install-commands.test.ts`

### 8.5 Phase 5: Documentation (Week 3)

1. Update README.md with registry usage
2. Create `docs/guides/registry-setup.md`
3. Create `docs/guides/creating-custom-registry.md`
4. Update CLI help text

## 9. Migration Path to Stockyard

### 9.1 Coexistence Strategy

The manifest-based system is designed to coexist with Stockyard:

```json
{
  "registries": [
    {
      "name": "fractary-core",
      "type": "manifest",
      "enabled": true,
      "priority": 1
    },
    {
      "name": "stockyard-production",
      "type": "stockyard",
      "enabled": true,
      "priority": 2
    }
  ]
}
```

### 9.2 Resolver Abstraction

```typescript
interface RegistryResolver {
  type: 'manifest' | 'stockyard';
  search(query: string, filters?: SearchFilters): Promise<RegistryItem[]>;
  resolve(name: string, version?: string): Promise<RegistryItem>;
  download(item: RegistryItem): Promise<Buffer>;
}

class ManifestResolver implements RegistryResolver {
  type = 'manifest' as const;
  // Manifest-specific implementation
}

class StockyardResolver implements RegistryResolver {
  type = 'stockyard' as const;
  // Stockyard API implementation (Phase 3C)
}
```

### 9.3 Migration Steps

1. **Phase 3B (Current)**: Implement manifest-based registries
2. **Phase 3C (Stockyard)**: Implement StockyardResolver alongside ManifestResolver
3. **Phase 3D (Transition)**: Default new users to Stockyard, support both types
4. **Phase 4 (Deprecation)**: Mark manifest registries as legacy, encourage Stockyard
5. **Phase 5 (Sunset)**: Remove manifest resolver support (TBD, timeline TBD)

## 10. Security Considerations

### 10.1 Checksum Verification

- All downloaded files MUST be verified against SHA-256 checksums
- Mismatched checksums should fail installation with clear error
- Option: `verify_checksums: false` for development only

### 10.2 HTTPS Requirements

- All manifest URLs MUST use HTTPS
- HTTP URLs should be rejected with error

### 10.3 Dependency Chain Trust

- Dependencies are resolved transitively
- User should be warned about total dependency count
- Option to review dependencies before installation: `--dry-run`

### 10.4 Future Enhancements

- GPG signature verification (requires manifest schema extension)
- Content Security Policy headers
- Sandboxed agent execution
- Rate limiting for registry queries

## 11. Success Criteria

### 11.1 Functional Requirements

- [ ] Users can add/remove/list registries via CLI
- [ ] Users can install packages from registries
- [ ] Resolution follows three-tier priority (local → global → remote)
- [ ] Manifests are cached with configurable TTL
- [ ] Checksums are verified on download
- [ ] Dependencies are automatically installed
- [ ] Multiple registries can coexist with priority ordering

### 11.2 Non-Functional Requirements

- [ ] Manifest resolution completes in <2 seconds
- [ ] Download progress is displayed for large packages
- [ ] Clear error messages for resolution failures
- [ ] Configuration is validated on load
- [ ] Cache invalidation works correctly

### 11.3 Testing Requirements

- [ ] Unit tests for all resolvers (>90% coverage)
- [ ] Integration tests for CLI commands
- [ ] End-to-end test: install from registry
- [ ] Cache behavior tests (TTL, freshness)
- [ ] Error handling tests (network failures, invalid manifests)

## 12. Open Questions

1. **Package naming conventions**: Should we enforce `@org/package` format or allow `package-name`?
2. **Version immutability**: Should we prevent overwriting existing versions?
3. **Global vs local default**: Should `forge install` default to global or local?
4. **Auto-update behavior**: Should we check for updates on agent execution?
5. **Offline mode**: How should Forge behave when network is unavailable?

## 13. References

- **SPEC-FORGE-003**: Stockyard Integration (Phase 3C)
- **WORK-00006**: Phase 3B FABER Agent Definitions Implementation
- **FORGE-PHASE-3B**: Detailed FABER agent specifications
- **Claude Code Plugin Marketplace**: Inspiration for registry architecture

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-15 | 1.0.0 | Initial specification created |
