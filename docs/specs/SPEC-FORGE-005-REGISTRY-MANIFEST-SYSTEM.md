# SPEC-FORGE-005: Registry Manifest System

**Version:** 1.2.0
**Status:** Draft
**Created:** 2025-12-15
**Updated:** 2025-12-15
**Author:** Fractary Team
**Related Work:** WORK-00006 (Phase 3B), SPEC-FORGE-003 (Stockyard Integration), SPEC-FORGE-007 (Claude to Fractary Conversion)

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

### 1.3 Forge Ecosystem Architecture

**Important Clarification**: This spec defines the **distribution layer** (Forge), not the execution layer. Here's how the pieces fit together:

```
┌─────────────────────────────────────────────────────────┐
│  FORGE Distribution Layer (This Spec)                    │
│  - Registry stores Fractary YAML (canonical format)      │
│  - Plugin installation via forge install                 │
│  - Export to any framework (Claude, LangChain, n8n, etc.)│
│  - Framework-agnostic                                    │
└─────────────────────────────────────────────────────────┘
                         ↓
                 Fractary YAML Format
                 (Internal Canonical)
                         ↓
┌─────────────────────────────────────────────────────────┐
│  FABER Orchestration Layer                               │
│  - Reads Fractary YAML directly                          │
│  - Orchestrates multi-agent workflows                    │
│  - Uses LangGraph internally (hidden from users)         │
│  - Framework-agnostic (can swap orchestration engine)    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  LangGraph/LangChain (Implementation Detail)             │
│  - Internal execution engine for FABER                   │
│  - Not exposed to users                                  │
│  - Could be swapped for better framework in future       │
└─────────────────────────────────────────────────────────┘
```

**Key Points:**

1. **Fractary YAML is canonical** for distribution and storage
   - Registry stores agents/tools in Fractary YAML format
   - Users work with Fractary YAML in `.fractary/` directories
   - Framework-independent format

2. **LangChain is NOT required for most use cases**
   - LangChain is an internal implementation detail of FABER
   - Users don't interact with LangChain code directly
   - Could be swapped for better orchestration framework in future

3. **Export enables framework interoperability**
   - Users can export Fractary YAML to LangChain format for LangChain projects
   - Users can export Fractary YAML to Claude format for Claude Code projects
   - Users can export Fractary YAML to n8n format for n8n automation
   - Export is **optional**, not required for execution

4. **Forge = Distribution layer only**
   - Handles registry, installation, versioning, interoperability
   - Does NOT handle agent execution
   - FABER handles orchestration and execution (using LangGraph internally)

**For end users:**
- Install agents: `forge install @fractary/faber-agents` → Fractary YAML
- Run workflows: `forge faber run 123` → FABER orchestrates (LangChain hidden)
- (Optional) Export: `forge export langchain @fractary/faber-agents` → LangChain Python code

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
| **stockyard** | Full API with auth, versioning | `stockyard.fractary.com/api/v1` | Phase 3C |

### 2.3 Two-Level Architecture

**Inspired by Claude Code plugin marketplace:**

```
Registry Manifest
└── References Plugins
    └── Plugin Manifest (separate file per plugin)
        ├── Agents (Fractary YAML definitions)
        ├── Tools (Fractary YAML definitions)
        ├── Workflows (Fractary YAML definitions)
        ├── Templates (Fractary YAML definitions)
        ├── Hooks (Scripts)
        ├── Commands (Markdown prompts)
        └── Configuration (JSON)
```

**Key Benefits:**
- **Selective enablement**: Enable registry but disable specific plugins
- **Scalability**: Registry manifest stays small, plugin manifests contain details
- **Natural bundling**: FABER plugin includes all related agents, tools, hooks, commands
- **Independent versioning**: Update plugin without touching registry
- **Organizational flexibility**: Publish plugin repos without registry approval

### 2.4 Directory Structure

```
Project-local:
.fractary/
├── plugins/          # Installed plugins
│   ├── @fractary/
│   │   ├── faber-plugin/
│   │   │   ├── plugin.json
│   │   │   ├── agents/       # Fractary YAML
│   │   │   ├── tools/        # Fractary YAML
│   │   │   ├── workflows/    # Fractary YAML
│   │   │   ├── templates/    # Fractary YAML
│   │   │   ├── hooks/        # Scripts
│   │   │   └── commands/     # Markdown prompts
│   │   └── work-plugin/
│   └── @acme/
│       └── custom-plugin/
├── agents/           # Standalone user-created agents (Fractary YAML)
├── tools/            # Standalone user-created tools (Fractary YAML)
├── workflows/        # Standalone user-created workflows (Fractary YAML)
├── templates/        # Standalone user-created templates (Fractary YAML)
└── config.json       # Registry configuration

Global user:
~/.fractary/
├── registry/
│   ├── plugins/      # Globally installed plugins
│   ├── agents/       # Globally installed standalone agents (Fractary YAML)
│   ├── tools/        # Globally installed standalone tools (Fractary YAML)
│   ├── workflows/    # Globally installed standalone workflows (Fractary YAML)
│   ├── templates/    # Globally installed standalone templates (Fractary YAML)
│   └── cache/        # Downloaded manifests
└── config.json       # Global registry configuration
```

## 3. Manifest Format

### 3.1 Registry Manifest Schema

**File:** `manifest.json` (registry-level)

The registry manifest lists available plugins with pointers to their individual manifests.

```json
{
  "$schema": "https://fractary.com/schemas/registry-manifest-v1.json",
  "name": "fractary-core",
  "version": "1.0.0",
  "description": "Official Fractary plugin registry",
  "updated": "2025-12-15T00:00:00Z",
  "plugins": [
    {
      "name": "@fractary/faber-plugin",
      "version": "2.0.0",
      "description": "FABER workflow methodology (agents, tools, hooks, commands)",
      "manifest_url": "https://raw.githubusercontent.com/fractary/faber-plugin/main/plugin.json",
      "homepage": "https://github.com/fractary/faber-plugin",
      "repository": "https://github.com/fractary/faber-plugin",
      "license": "MIT",
      "tags": ["faber", "workflow", "official"],
      "checksum": "sha256:abc123..."
    },
    {
      "name": "@fractary/work-plugin",
      "version": "2.0.0",
      "description": "Work tracking integration (GitHub, Jira, Linear)",
      "manifest_url": "https://raw.githubusercontent.com/fractary/work-plugin/main/plugin.json",
      "homepage": "https://github.com/fractary/work-plugin",
      "repository": "https://github.com/fractary/work-plugin",
      "license": "MIT",
      "tags": ["work", "tracking", "official"],
      "checksum": "sha256:def456..."
    },
    {
      "name": "@acme/custom-plugin",
      "version": "1.0.0",
      "description": "ACME Corp custom workflow plugin",
      "manifest_url": "https://raw.githubusercontent.com/acme-corp/custom-plugin/main/plugin.json",
      "homepage": "https://github.com/acme-corp/custom-plugin",
      "repository": "https://github.com/acme-corp/custom-plugin",
      "license": "Proprietary",
      "tags": ["custom", "acme"],
      "checksum": "sha256:ghi789..."
    }
  ]
}
```

### 3.2 Plugin Manifest Schema

**File:** `plugin.json` (plugin-level)

Each plugin has its own manifest containing detailed definitions.

```json
{
  "$schema": "https://fractary.com/schemas/plugin-manifest-v1.json",
  "name": "@fractary/faber-plugin",
  "version": "2.0.0",
  "description": "FABER workflow methodology - Frame, Architect, Build, Evaluate, Release",
  "author": "Fractary Team",
  "homepage": "https://github.com/fractary/faber-plugin",
  "repository": "https://github.com/fractary/faber-plugin",
  "license": "MIT",
  "tags": ["faber", "workflow", "official"],

  "agents": [
    {
      "name": "frame-agent",
      "version": "2.0.0",
      "description": "FABER Frame phase - requirements gathering",
      "source": "https://raw.githubusercontent.com/fractary/faber-plugin/main/agents/frame-agent@2.0.0.yaml",
      "checksum": "sha256:abc123...",
      "size": 4096,
      "dependencies": ["fetch_issue", "classify_work_type"]
    },
    {
      "name": "architect-agent",
      "version": "2.0.0",
      "description": "FABER Architect phase - solution design",
      "source": "https://raw.githubusercontent.com/fractary/faber-plugin/main/agents/architect-agent@2.0.0.yaml",
      "checksum": "sha256:def456...",
      "size": 5120,
      "dependencies": ["create_specification"]
    },
    {
      "name": "build-agent",
      "version": "2.0.0",
      "description": "FABER Build phase - implementation",
      "source": "https://raw.githubusercontent.com/fractary/faber-plugin/main/agents/build-agent@2.0.0.yaml",
      "checksum": "sha256:jkl012...",
      "size": 6144
    }
  ],

  "tools": [
    {
      "name": "fetch_issue",
      "version": "2.0.0",
      "description": "Fetch work item details from tracking systems",
      "source": "https://raw.githubusercontent.com/fractary/faber-plugin/main/tools/fetch_issue@2.0.0.yaml",
      "checksum": "sha256:mno345...",
      "size": 2048
    },
    {
      "name": "classify_work_type",
      "version": "2.0.0",
      "description": "Classify work as feature/bug/chore/patch",
      "source": "https://raw.githubusercontent.com/fractary/faber-plugin/main/tools/classify_work_type@2.0.0.yaml",
      "checksum": "sha256:pqr678...",
      "size": 1536
    }
  ],

  "hooks": [
    {
      "name": "faber-commit",
      "version": "2.0.0",
      "description": "Auto-format commits with FABER metadata",
      "type": "pre-commit",
      "source": "https://raw.githubusercontent.com/fractary/faber-plugin/main/hooks/faber-commit@2.0.0.js",
      "checksum": "sha256:stu901...",
      "size": 3072
    }
  ],

  "commands": [
    {
      "name": "faber-run",
      "version": "2.0.0",
      "description": "Execute FABER workflow on work item",
      "source": "https://raw.githubusercontent.com/fractary/faber-plugin/main/commands/faber-run@2.0.0.md",
      "checksum": "sha256:vwx234...",
      "size": 2560
    }
  ],

  "workflows": [
    {
      "name": "faber-full-cycle",
      "version": "2.0.0",
      "description": "Complete FABER workflow from Frame to Release",
      "source": "https://raw.githubusercontent.com/fractary/faber-plugin/main/workflows/faber-full-cycle@2.0.0.yaml",
      "checksum": "sha256:yza567...",
      "size": 8192,
      "dependencies": ["frame-agent", "architect-agent", "build-agent"]
    }
  ],

  "templates": [
    {
      "name": "work-spec-template",
      "version": "2.0.0",
      "description": "Standard WORK specification template",
      "source": "https://raw.githubusercontent.com/fractary/faber-plugin/main/templates/work-spec@2.0.0.yaml",
      "checksum": "sha256:bcd890...",
      "size": 4096
    }
  ],

  "config": {
    "default_llm": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514"
    },
    "permissions": {
      "read": ["**/*.md", "**/*.yaml"],
      "write": [".fractary/**"],
      "execute": ["bash"]
    }
  }
}
```

### 3.3 Manifest Schema Validation

**Zod Schemas:** `src/registry/schemas/manifest.ts`

```typescript
import { z } from 'zod';

// ============================================================================
// Registry Manifest Schemas
// ============================================================================

export const RegistryPluginReferenceSchema = z.object({
  name: z.string().regex(/^@[a-z0-9-]+\/[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  manifest_url: z.string().url(),
  homepage: z.string().url().optional(),
  repository: z.string().url(),
  license: z.string(),
  tags: z.array(z.string()),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export const RegistryManifestSchema = z.object({
  $schema: z.string().url().optional(),
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  updated: z.string().datetime(),
  plugins: z.array(RegistryPluginReferenceSchema),
});

export type RegistryPluginReference = z.infer<typeof RegistryPluginReferenceSchema>;
export type RegistryManifest = z.infer<typeof RegistryManifestSchema>;

// ============================================================================
// Plugin Manifest Schemas
// ============================================================================

export const PluginItemSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  source: z.string().url(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  size: z.number().min(1),
  dependencies: z.array(z.string()).optional(),
});

export const PluginHookSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  type: z.enum(['pre-commit', 'post-commit', 'pre-push', 'post-push', 'session-start', 'session-end']),
  source: z.string().url(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  size: z.number().min(1),
});

export const PluginCommandSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  source: z.string().url(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  size: z.number().min(1),
});

export const PluginConfigSchema = z.object({
  default_llm: z.object({
    provider: z.enum(['anthropic', 'openai', 'google']),
    model: z.string(),
  }).optional(),
  permissions: z.object({
    read: z.array(z.string()).optional(),
    write: z.array(z.string()).optional(),
    execute: z.array(z.string()).optional(),
  }).optional(),
}).optional();

export const PluginWorkflowSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  source: z.string().url(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  size: z.number().min(1),
  dependencies: z.array(z.string()).optional(),
});

export const PluginTemplateSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  source: z.string().url(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  size: z.number().min(1),
});

export const PluginManifestSchema = z.object({
  $schema: z.string().url().optional(),
  name: z.string().regex(/^@[a-z0-9-]+\/[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  author: z.string(),
  homepage: z.string().url().optional(),
  repository: z.string().url(),
  license: z.string(),
  tags: z.array(z.string()),
  agents: z.array(PluginItemSchema).optional(),
  tools: z.array(PluginItemSchema).optional(),
  workflows: z.array(PluginWorkflowSchema).optional(),
  templates: z.array(PluginTemplateSchema).optional(),
  hooks: z.array(PluginHookSchema).optional(),
  commands: z.array(PluginCommandSchema).optional(),
  config: PluginConfigSchema,
});

export type PluginItem = z.infer<typeof PluginItemSchema>;
export type PluginHook = z.infer<typeof PluginHookSchema>;
export type PluginCommand = z.infer<typeof PluginCommandSchema>;
export type PluginWorkflow = z.infer<typeof PluginWorkflowSchema>;
export type PluginTemplate = z.infer<typeof PluginTemplateSchema>;
export type PluginConfig = z.infer<typeof PluginConfigSchema>;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;
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
      "url": "https://stockyard.fractary.com/api/v1",
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
# stockyard         stockyard  https://stockyard.fractary.com/api/v1  ✗        3
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

### 5.2 Plugin Installation

#### `forge install`

Install plugins (or individual agents/tools) from registries.

```bash
# Install a complete plugin (includes all agents, tools, hooks, commands)
forge install @fractary/faber-plugin

# Install specific agent from a plugin
forge install @fractary/faber-plugin/frame-agent

# Install specific tool from a plugin
forge install @fractary/faber-plugin/fetch_issue

# Install multiple plugins
forge install @fractary/faber-plugin @fractary/work-plugin

# Install with version constraint
forge install @fractary/faber-plugin@2.0.0

# Enable/disable plugin components selectively
forge install @fractary/faber-plugin --agents-only  # Only install agents
forge install @fractary/faber-plugin --no-hooks     # Skip hooks
```

**Options:**
- `--global`: Install to ~/.fractary/registry/ [default]
- `--local`: Install to .fractary/
- `--registry <name>`: Install from specific registry
- `--no-deps`: Skip dependency installation
- `--force`: Overwrite existing files
- `--dry-run`: Show what would be installed without installing
- `--agents-only`: Install only agents from plugin
- `--tools-only`: Install only tools from plugin
- `--no-hooks`: Skip installing hooks
- `--no-commands`: Skip installing commands

**Output:**
```
Installing @fractary/faber-plugin@2.0.0...
  ✓ Resolved from registry: fractary-core
  ✓ Downloaded plugin manifest (plugin.json)
  ✓ Verified manifest checksum: sha256:abc123...

Installing agents (Fractary YAML format)...
  ✓ frame-agent@2.0.0 (4.0 KB)
  ✓ architect-agent@2.0.0 (5.0 KB)
  ✓ build-agent@2.0.0 (6.0 KB)

Installing tools (Fractary YAML format)...
  ✓ fetch_issue@2.0.0 (2.0 KB)
  ✓ classify_work_type@2.0.0 (1.5 KB)
  ✓ create_specification@2.0.0 (3.0 KB)

Installing workflows (Fractary YAML format)...
  ✓ faber-full-cycle@2.0.0 (8.0 KB)

Installing templates (Fractary YAML format)...
  ✓ work-spec-template@2.0.0 (4.0 KB)

Installing hooks...
  ✓ faber-commit@2.0.0 (3.0 KB)

Installing commands...
  ✓ faber-run@2.0.0 (2.5 KB)

Successfully installed @fractary/faber-plugin@2.0.0 (Fractary YAML format)
  3 agents, 3 tools, 1 workflow, 1 template, 1 hook, 1 command
  Installed to: ~/.fractary/registry/plugins/@fractary/faber-plugin/

  Run with FABER: forge faber run <issue-number>
  Export to other formats: forge export <langchain|claude|n8n> @fractary/faber-plugin
```

#### `forge list`

List installed plugins, agents, tools, workflows, templates, hooks, and commands.

```bash
forge list

# Output:
# TYPE      NAME                       VERSION  LOCATION
# plugin    @fractary/faber-plugin     2.0.0    ~/.fractary/registry/plugins/
# plugin    @fractary/work-plugin      2.0.0    ~/.fractary/registry/plugins/
# agent     frame-agent                2.0.0    ~/.fractary/registry/plugins/@fractary/faber-plugin/agents/
# agent     architect-agent            2.0.0    ~/.fractary/registry/plugins/@fractary/faber-plugin/agents/
# tool      fetch_issue                2.0.0    ~/.fractary/registry/plugins/@fractary/faber-plugin/tools/
# workflow  faber-full-cycle           2.0.0    ~/.fractary/registry/plugins/@fractary/faber-plugin/workflows/
# template  work-spec-template         2.0.0    ~/.fractary/registry/plugins/@fractary/faber-plugin/templates/
# hook      faber-commit               2.0.0    ~/.fractary/registry/plugins/@fractary/faber-plugin/hooks/
# command   faber-run                  2.0.0    ~/.fractary/registry/plugins/@fractary/faber-plugin/commands/
```

**Options:**
- `--type <plugin|agent|tool|workflow|template|hook|command>`: Filter by type
- `--global`: Show global installations only
- `--local`: Show local installations only
- `--all`: Show both global and local [default]
- `--plugin <name>`: Show only items from specific plugin
- `--format <fractary|all>`: Show format (default: all)

#### `forge uninstall`

Uninstall plugins or individual components.

```bash
# Uninstall entire plugin
forge uninstall @fractary/faber-plugin

# Uninstall specific agent
forge uninstall @fractary/faber-plugin/frame-agent

# Options:
# --global: Uninstall from global location
# --local: Uninstall from local location
```

#### `forge search`

Search for plugins in registries.

```bash
forge search faber

# Output:
# NAME                       VERSION  DESCRIPTION                           REGISTRY
# @fractary/faber-plugin     2.0.0    FABER workflow methodology            fractary-core
# @acme/faber-extensions     1.0.0    Custom FABER extensions               acme-internal
```

**Options:**
- `--type <plugin|agent|tool>`: Filter by type
- `--registry <name>`: Search specific registry only
- `--tag <tag>`: Filter by tag

### 5.3 Framework Export (Optional Interoperability)

**Important**: Export is **optional** for framework interoperability. FABER reads Fractary YAML directly - you only need export if working with other frameworks.

#### `forge export`

Export Fractary YAML to other framework formats.

```bash
# Export to LangChain Python format (for LangChain projects)
forge export langchain @fractary/faber-plugin --output ./langchain/

# Export to Claude Code format (for Claude Code projects)
forge export claude @fractary/faber-plugin --output ./.claude/

# Export to n8n workflow format
forge export n8n @fractary/faber-plugin --output ./n8n-workflows/

# Export specific agent
forge export langchain @fractary/faber-plugin/frame-agent
```

**Supported Formats:**
- `langchain`: LangChain Python code
- `claude`: Claude Code TypeScript/Markdown
- `n8n`: n8n workflow JSON
- `crewai`: Crew AI Python code (future)

**Options:**
- `--output <path>`: Output directory for exported files
- `--format <format>`: Explicitly specify export format
- `--overwrite`: Overwrite existing files

**Output Example (LangChain):**
```
Exporting @fractary/faber-plugin to LangChain format...
  ✓ Converted frame-agent → frame_agent.py
  ✓ Converted architect-agent → architect_agent.py
  ✓ Converted build-agent → build_agent.py
  ✓ Converted fetch_issue tool → fetch_issue_tool.py
  ✓ Generated requirements.txt

Successfully exported to: ./langchain/
  3 agents, 3 tools
  Files: 7 Python files, 1 requirements.txt
```

**When to use export:**
- Working with LangChain projects → export to LangChain
- Sharing with Claude Code users → export to Claude format
- Integrating with n8n automation → export to n8n workflows
- **NOT needed** for FABER workflows (FABER reads Fractary YAML natively)

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
10. `src/cli/commands/export.ts` (Framework export for interoperability)

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
2. **Phase 3C (Stockyard Base)**: Implement StockyardResolver alongside ManifestResolver
3. **Phase 3D (Transition)**: Default new users to Stockyard, support both types
4. **Phase 4 (Translation Service)**: Stockyard auto-converts agents from other formats (see 9.4)
5. **Phase 5 (Deprecation)**: Mark manifest registries as legacy, encourage Stockyard
6. **Phase 6 (Sunset)**: Remove manifest resolver support (TBD, timeline TBD)

### 9.4 Stockyard Translation Service (Future Phase 4)

**Strategic Vision**: Stockyard will evolve beyond a simple marketplace to become a **universal translation hub** for agentic artifacts.

#### Translation Architecture

Stockyard will automatically:
1. **Ingest** artifacts from existing ecosystems:
   - Claude Code skills/agents/commands
   - n8n workflows
   - LangChain agents
   - Crew AI crews
   - GitHub Actions workflows
   - Any published agentic artifact

2. **Auto-convert** to Fractary format:
   - Parse source format
   - Generate Fractary YAML definitions
   - Create plugin manifest
   - Auto-generate registry for each source
   - Validate and test conversions

3. **Publish** auto-generated registries:
   - Each source gets a registry: `stockyard.fractary.com/registries/claude-skills.json`
   - Users can: `forge registry add claude-skills --url https://stockyard.fractary.com/registries/claude-skills.json`
   - Instant access to thousands of existing agents

4. **Bidirectional translation**:
   - Fractary → Claude Code format
   - Fractary → n8n workflows
   - Fractary → LangChain
   - Fractary becomes universal interchange format

#### Strategic Benefits

- **Immediate ecosystem access**: Day 1, users access entire Claude/n8n/LangChain ecosystems
- **Network effects**: As more formats supported, Fractary becomes central hub
- **Solves adoption**: "Use Fractary to access agents from ANY framework"
- **Differentiator**: Not competing with Claude/n8n, but enabling interoperability
- **Future-proof**: New agentic frameworks automatically supported

#### Example Enhanced Stockyard Listing

```
Database Schema Generator
├── Original: Claude Code skill by @author
├── Source: github.com/author/claude-skills
├── Formats Available:
│   ├── Fractary Plugin (auto-generated) [Install via forge]
│   ├── Claude Code (original) [View source]
│   ├── LangChain (auto-generated) [Download]
│   └── n8n Workflow (auto-generated) [Download]
├── Auto-generated Registry: stockyard.fractary.com/registries/author-claude-skills.json
└── Stats: ⭐⭐⭐⭐⭐ (247 installs across all formats)
```

**Implementation**: This translation service will be specified in a future SPEC-FORGE-006 document.

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
| 2025-12-15 | 1.1.0 | **Major update**: Added two-level plugin architecture inspired by Claude Code marketplace. Registries now reference plugins (not individual agents). Each plugin has its own manifest with agents/tools/hooks/commands. Updated all CLI commands, schemas, and examples. Added Stockyard translation service vision (section 9.4). Fixed Stockyard URL to stockyard.fractary.com |
| 2025-12-15 | 1.2.0 | **Architecture clarification**: Added section 1.3 defining Forge ecosystem layers (Distribution → Orchestration → Execution). Clarified Fractary YAML as canonical format for distribution. Expanded plugin scope to include workflows and templates. Added `forge export` command for optional framework interoperability (LangChain, Claude, n8n). Updated all schemas, directory structures, and CLI outputs to reflect workflows/templates. Emphasized that FABER reads Fractary YAML directly and LangChain is internal implementation detail. |
