# IMPL-20251216: Fractary Plugins Integration

**Status**: In Progress
**Created**: 2025-12-16
**Owner**: Fractary Team
**Related**: WORK-00006, SPEC-FORGE-008

---

## Overview

This document outlines the integration steps required to connect the **fractary/plugins** repository with the **fractary/forge** package, enabling plugin installation, resolution, and distribution through the Forge registry system.

### Context

The **fractary/plugins** repository contains 9 official Fractary plugins with **94 tools** and **9 agents** using the Fractary YAML definition format and the **directory-per-definition** structure ([SPEC-FORGE-008](./SPEC-FORGE-008-DIRECTORY-PER-DEFINITION.md)).

**Repository Structure**:
```
fractary/plugins/
├── registry.json                    # Central registry manifest
└── plugins/
    ├── faber/                      # FABER workflow plugin
    ├── repo/                       # Source control plugin
    ├── work/                       # Work tracking plugin
    ├── file/                       # File storage plugin
    ├── codex/                      # Knowledge management plugin
    ├── docs/                       # Documentation plugin
    ├── spec/                       # Specification plugin
    ├── logs/                       # Logging plugin
    └── status/                     # Status line plugin
```

**Each plugin follows**:
```
plugins/{plugin-name}/
├── plugin.json                     # Plugin manifest
├── agents/
│   └── {agent-name}/
│       └── agent.yaml
├── tools/
│   └── {tool-name}/
│       ├── tool.yaml
│       ├── scripts/
│       └── workflow/
└── skills/
    └── {skill-name}/
        └── SKILL.md
```

---

## Architecture Changes

### 1. Directory-Per-Definition Structure

**Status**: ✅ COMPLETE
**Date**: 2025-12-16
**PR**: #8

The Forge resolver has been updated to support the new directory-per-definition structure:

- **Local paths**: `.fractary/agents/{name}/agent.yaml`
- **Global paths**: `~/.fractary/registry/agents/{name}@{version}/agent.yaml`
- **Remote paths**: Following same pattern after download

**Code Changes**:
- `src/definitions/registry/resolver.ts`:
  - Updated `getLocalPath()` to use `{name}/agent.yaml` pattern
  - Updated `checkGlobalAgent()` to glob `{name}@*/agent.yaml`
  - Updated `checkGlobalTool()` to glob `{name}@*/tool.yaml`

**Specification**:
- Created [SPEC-FORGE-008](./SPEC-FORGE-008-DIRECTORY-PER-DEFINITION.md)

---

## Integration Steps

### Phase 1: Registry Manifest System (COMPLETED)

**Status**: ✅ COMPLETE
**Version**: forge@1.1.2
**Tracking**: [SPEC-FORGE-005](./SPEC-FORGE-005-REGISTRY-MANIFEST-SYSTEM.md)

**Deliverables**:
- [x] RegistryManifest and PluginManifest types
- [x] Local, Global, and Remote resolvers
- [x] Cache manager with TTL
- [x] Installer with dependency resolution
- [x] Config manager for registry settings

**Result**: The registry infrastructure is ready to consume plugin manifests.

---

### Phase 2: Plugins Repository Setup (COMPLETED)

**Status**: ✅ COMPLETE
**Repository**: [fractary/plugins](https://github.com/fractary/plugins)
**Version**: v2.0.0

**Deliverables**:
- [x] Central `registry.json` with 9 plugin entries
- [x] 9 plugin directories with `plugin.json` manifests
- [x] 94 tools converted to Fractary YAML format
- [x] 9 agents converted to Fractary YAML format
- [x] Directory-per-definition structure
- [x] Supporting files (scripts, workflows, docs)

**Registry Manifest Structure**:
```json
{
  "version": "1.0.0",
  "registry": "https://github.com/fractary/plugins",
  "plugins": [
    {
      "name": "@fractary/faber-plugin",
      "version": "2.0.0",
      "description": "FABER workflow methodology",
      "manifest": "https://raw.githubusercontent.com/fractary/plugins/main/plugins/faber/plugin.json",
      "checksum": "sha256:..."
    },
    ...
  ]
}
```

---

### Phase 3: CLI Integration (IN PROGRESS)

**Status**: 🚧 IN PROGRESS
**Target**: forge@1.2.0
**Tracking**: [SPEC-FORGE-006](./SPEC-FORGE-006-CLI-COMMANDS.md)

#### 3.1 Registry Commands

Implement CLI commands for registry management:

```bash
# Add registry source
forge registry add <name> <url>

# List available registries
forge registry list

# Search for plugins
forge registry search <query>

# Show plugin details
forge registry show @fractary/faber-plugin
```

**Implementation Path**: `src/cli/commands/registry.ts`

**Dependencies**:
- Registry module (✅ Complete)
- Config manager (✅ Complete)
- Cache manager (✅ Complete)

#### 3.2 Install Commands

Implement plugin installation:

```bash
# Install plugin (latest version)
forge install @fractary/faber-plugin

# Install specific version
forge install @fractary/faber-plugin@2.0.0

# Install to global registry
forge install @fractary/faber-plugin --global

# Install with specific components
forge install @fractary/faber-plugin --agents only
forge install @fractary/faber-plugin --tools fetch-issue,create-commit
```

**Implementation Path**: `src/cli/commands/install.ts`

**Features Needed**:
- Plugin manifest download and validation
- Component extraction (agents, tools)
- Dependency resolution
- Version conflict detection
- Progress reporting
- Rollback on failure

#### 3.3 List Commands

Show installed plugins and components:

```bash
# List installed plugins
forge list

# List installed agents
forge list agents

# List installed tools
forge list tools

# Show plugin info
forge info @fractary/faber-plugin
```

**Implementation Path**: `src/cli/commands/list.ts`

---

### Phase 4: Registry Resolution Updates (PENDING)

**Status**: 📋 PLANNED
**Target**: forge@1.2.0

#### 4.1 Manifest-Based Resolution

Update resolvers to support manifest-based lookups:

**Current**:
- Local: `.fractary/agents/{name}/agent.yaml`
- Global: `~/.fractary/registry/agents/{name}@{version}/agent.yaml`
- Remote: Not implemented

**Target**:
- Local: (Unchanged)
- Global: Check `.fractary/registry/manifests/{plugin}/plugin.json` first
- Remote: Download from manifest URL, cache, then resolve

**Implementation**:
1. Create `ManifestResolver` class
2. Update `DefinitionResolver` to try manifest-based lookup before file-based
3. Implement manifest caching with TTL
4. Add checksum validation

**Files to Update**:
- `src/definitions/registry/resolver.ts`
- `src/definitions/registry/manifest-resolver.ts` (new)
- `src/definitions/registry/types.ts`

#### 4.2 Remote Registry Support

Enable fetching from remote registries:

```typescript
// Example: Resolve from remote
const resolver = new DefinitionResolver({
  remote: {
    enabled: true,
    registries: [
      {
        name: 'fractary-official',
        url: 'https://github.com/fractary/plugins/raw/main/registry.json',
        priority: 1
      }
    ]
  }
});

const agent = await resolver.resolveAgent('@fractary/faber-plugin:faber-manager');
```

**Features**:
- HTTP/HTTPS registry fetching
- GitHub raw URL support
- Manifest validation
- Component download and cache
- Version constraint matching

---

### Phase 5: Plugin Installation Workflow (PENDING)

**Status**: 📋 PLANNED
**Target**: forge@1.2.0

#### Installation Process

```
User runs: forge install @fractary/faber-plugin
    ↓
1. Fetch registry.json from configured registries
    ↓
2. Find plugin entry in registry
    ↓
3. Download plugin.json manifest
    ↓
4. Validate checksum
    ↓
5. Resolve dependencies
    ↓
6. Download components (agents, tools)
    ↓
7. Install to ~/.fractary/registry/{plugin}@{version}/
    ↓
8. Update local registry cache
    ↓
9. Verify installation
    ↓
Done: Plugin installed and ready to use
```

#### Directory Structure After Install

```
~/.fractary/registry/
├── manifests/
│   └── @fractary/
│       ├── faber-plugin@2.0.0.json
│       ├── repo-plugin@2.0.0.json
│       └── work-plugin@2.0.0.json
├── agents/
│   ├── faber-manager@2.0.0/
│   │   └── agent.yaml
│   ├── repo-manager@2.0.0/
│   │   └── agent.yaml
│   └── work-manager@2.0.0/
│       └── agent.yaml
└── tools/
    ├── frame@2.0.0/
    │   ├── tool.yaml
    │   └── workflow/
    ├── branch-manager@2.0.0/
    │   └── tool.yaml
    └── issue-creator@2.0.0/
        └── tool.yaml
```

---

### Phase 6: Export Integration (COMPLETE)

**Status**: ✅ COMPLETE
**Version**: forge@1.1.2
**Tracking**: Exporters module

The export system supports converting Fractary YAML to framework-specific formats:

```bash
# Export to LangChain
forge export @fractary/faber-plugin --format langchain --output ./langchain/

# Export to Claude Code
forge export @fractary/faber-plugin --format claude --output .claude/

# Export to n8n
forge export @fractary/faber-plugin --format n8n --output ./n8n/
```

**Supported Formats**:
- ✅ LangChain (Python with LangGraph)
- ✅ Claude Code (Markdown skills)
- ✅ n8n (JSON workflows)

---

## Testing Strategy

### Unit Tests

**Required Coverage**:
- [x] Registry manifest parsing
- [x] Component resolution (agents, tools)
- [x] Version constraint matching
- [x] Cache management
- [ ] CLI command parsing
- [ ] Installation workflow
- [ ] Export functionality

**Test Files**:
- `src/registry/__tests__/manifest.test.ts`
- `src/registry/__tests__/resolver.test.ts`
- `src/registry/__tests__/installer.test.ts`
- `src/cli/__tests__/install.test.ts` (pending)

### Integration Tests

**Scenarios**:
1. Install plugin from fractary/plugins registry
2. Resolve agent from installed plugin
3. Resolve tool with version constraints
4. Export plugin to LangChain format
5. Handle network failures gracefully
6. Validate checksums
7. Rollback failed installations

**Test Approach**:
- Use test fixtures for manifests
- Mock HTTP requests
- Create temporary test registries
- Verify file system state

### End-to-End Tests

**Workflow Test**:
```bash
# 1. Install FABER plugin
forge install @fractary/faber-plugin

# 2. Verify agents installed
forge list agents | grep faber-manager

# 3. Resolve agent
node -e "
  const { AgentAPI } = require('@fractary/forge');
  const api = new AgentAPI();
  api.getAgent('faber-manager@2.0.0').then(console.log);
"

# 4. Export to Claude Code
forge export @fractary/faber-plugin --format claude --output .claude/

# 5. Verify exported files
ls -la .claude/agents/faber-manager/
```

---

## Configuration

### Registry Configuration File

Location: `~/.fractary/forge-config.json`

```json
{
  "registries": [
    {
      "name": "fractary-official",
      "url": "https://github.com/fractary/plugins/raw/main/registry.json",
      "enabled": true,
      "priority": 1,
      "cache_ttl": 3600
    }
  ],
  "install": {
    "default_location": "global",
    "verify_checksums": true,
    "auto_resolve_dependencies": true
  },
  "cache": {
    "enabled": true,
    "ttl": 86400,
    "max_size": "500MB"
  }
}
```

### Project Configuration

Location: `.fractary/forge.json` (project-specific)

```json
{
  "dependencies": {
    "@fractary/faber-plugin": "^2.0.0",
    "@fractary/repo-plugin": "~2.0.0",
    "@fractary/work-plugin": ">=2.0.0"
  },
  "agents": [
    "faber-manager",
    "repo-manager"
  ],
  "tools": [
    "frame",
    "architect",
    "branch-manager"
  ]
}
```

---

## Documentation Updates

### User-Facing Docs

**Required Documentation**:
- [ ] Installation guide for Forge CLI
- [ ] Plugin installation walkthrough
- [ ] Registry configuration guide
- [ ] Agent/tool usage examples
- [ ] Export format guides
- [ ] Troubleshooting common issues

**Location**: `docs/user-guide/`

### Developer Docs

**Required Documentation**:
- [x] Directory-per-definition spec ([SPEC-FORGE-008](./SPEC-FORGE-008-DIRECTORY-PER-DEFINITION.md))
- [ ] Registry manifest system guide
- [ ] Creating custom plugins
- [ ] Contributing to fractary/plugins
- [ ] Testing plugin integrations

**Location**: `docs/developer-guide/`

---

## Migration Path

### For Existing Projects

Projects using old flat structure need migration:

**Before**:
```
.fractary/
├── agents/
│   ├── custom-agent.yaml
│   └── another-agent.yaml
└── tools/
    ├── custom-tool.yaml
    └── helper-tool.yaml
```

**After**:
```
.fractary/
├── agents/
│   ├── custom-agent/
│   │   └── agent.yaml
│   └── another-agent/
│       └── agent.yaml
└── tools/
    ├── custom-tool/
    │   └── tool.yaml
    └── helper-tool/
        └── tool.yaml
```

**Migration Command** (future):
```bash
forge migrate --to directory-structure
```

---

## Timeline

### Completed (v1.1.2)

- ✅ Registry module (resolvers, cache, config, installer)
- ✅ Exporters module (LangChain, Claude, n8n)
- ✅ Directory-per-definition resolver updates
- ✅ SPEC-FORGE-008 documentation

### In Progress (v1.2.0)

- 🚧 CLI commands (registry, install, list)
- 🚧 Manifest-based resolution
- 🚧 Remote registry support

### Planned (v1.3.0)

- 📋 Advanced dependency resolution
- 📋 Plugin versioning and upgrades
- 📋 Migration tooling
- 📋 Plugin scaffolding commands

---

## Success Criteria

### Phase 3 (CLI Integration)

- [ ] Users can run `forge install @fractary/faber-plugin`
- [ ] Plugins install to `~/.fractary/registry/`
- [ ] Agents/tools are resolvable after installation
- [ ] `forge list` shows installed components
- [ ] Installation validates checksums

### Phase 4 (Registry Resolution)

- [ ] Resolver tries manifests before file globbing
- [ ] Remote registries can be configured
- [ ] Components download and cache correctly
- [ ] Version constraints work with manifest-based lookup

### Phase 5 (Complete Integration)

- [ ] All 9 official plugins installable
- [ ] All 94 tools resolvable
- [ ] All 9 agents resolvable
- [ ] Export works for all plugins
- [ ] Documentation complete

---

## Open Questions

1. **Versioning Strategy**: How should we handle breaking changes in agent/tool YAML schemas?
   - Proposal: Follow semantic versioning, breaking changes require major version bump

2. **Dependency Conflicts**: What if two plugins require different versions of the same tool?
   - Proposal: Install both versions, use full path with version in references

3. **Private Registries**: How should authentication work for private registries?
   - Proposal: Support `.netrc`, environment variables, or config file tokens

4. **Update Strategy**: How should users update installed plugins?
   - Proposal: `forge update` command that respects semver constraints

5. **Offline Mode**: Should Forge support fully offline installation?
   - Proposal: Download cache for air-gapped environments

---

## Related Documents

- [SPEC-FORGE-005](./SPEC-FORGE-005-REGISTRY-MANIFEST-SYSTEM.md): Registry Manifest System
- [SPEC-FORGE-008](./SPEC-FORGE-008-DIRECTORY-PER-DEFINITION.md): Directory-Per-Definition Structure
- [WORK-00006](./WORK-00006-phase-3b-faber-agent-definitions-implementation.md): Phase 3B Implementation
- [IMPL-20251215-CROSS-PROJECT-ROADMAP](./IMPL-20251215-CROSS-PROJECT-ROADMAP.md): Cross-Project Roadmap

---

**Next Actions**:
1. Begin Phase 3.1: Implement `forge registry` commands
2. Begin Phase 3.2: Implement `forge install` command
3. Update Phase 3B spec to reference new directory structure
4. Create CLI integration tests
5. Document installation workflow for users

---

**Document Version**: 1.0.0
**Status**: Living Document
**Last Updated**: 2025-12-16
