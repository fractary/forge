# IMPL-20251215: Cross-Project Implementation Roadmap

**Created:** 2025-12-15
**Author:** Fractary Team
**Status:** Planning
**Related Specs:** SPEC-FORGE-005, SPEC-FORGE-007, WORK-00006

## 1. Overview

This document provides a cross-project implementation roadmap for the Forge/FABER ecosystem architecture. It breaks down what needs to be implemented in each project and provides a clear sequence for implementation.

### 1.1 Projects Involved

| Project | Repository | Purpose | Current State |
|---------|-----------|---------|---------------|
| **forge** | `fractary/forge` | Distribution layer (registry, installation, export) | Active development |
| **faber** | `fractary/faber` | Orchestration layer (workflow execution, LangGraph) | Exists, needs updates |
| **plugins** | `fractary/plugins` | Plugin repository (converted from claude-plugins) | **To be created** |
| **forge-registry** | `fractary/forge-registry` | Manifest-based registry (Phase 3B) | **To be created** |

### 1.2 Architecture Recap

```
┌─────────────────────────────────────────────────────────┐
│  FORGE (fractary/forge)                                  │
│  - CLI commands: forge install, forge export             │
│  - Registry resolution and caching                       │
│  - Plugin installation and management                    │
│  - Framework export (LangChain, Claude, n8n)             │
└─────────────────────────────────────────────────────────┘
                         ↓
                 Fractary YAML Format
                         ↓
┌─────────────────────────────────────────────────────────┐
│  FABER (fractary/faber)                                  │
│  - Read Fractary YAML agent/workflow definitions         │
│  - Orchestrate multi-agent workflows                     │
│  - LangGraph integration (internal)                      │
│  - Execute FABER methodology (Frame → Release)           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PLUGINS (fractary/plugins)                              │
│  - FABER plugin (agents, tools, workflows, templates)    │
│  - Work plugin (GitHub, Jira, Linear integration)        │
│  - Repo plugin (Git operations, PRs, branches)           │
│  - Spec plugin (specification management)                │
│  - All in Fractary YAML format                           │
└─────────────────────────────────────────────────────────┘
```

## 2. Project-Specific Breakdown

### 2.1 PROJECT: fractary/forge (This Repository)

**Purpose:** Distribution layer - registry, installation, versioning, export

**Specs:**
- SPEC-FORGE-005: Registry Manifest System
- SPEC-FORGE-007: Claude to Fractary Conversion Guide
- WORK-00006: Phase 3B Implementation

**Work Items:**

#### Phase 3B.1: Registry Infrastructure (Week 1)
- [ ] `src/registry/schemas/manifest.ts` - Registry and plugin manifest Zod schemas
- [ ] `src/registry/schemas/config.ts` - Configuration schemas
- [ ] `src/registry/resolvers/manifest-resolver.ts` - Manifest fetching and caching
- [ ] `src/registry/resolvers/local-resolver.ts` - Local file system resolution
- [ ] `src/registry/cache.ts` - Caching with TTL
- [ ] `src/registry/resolver.ts` - Three-tier resolution algorithm
- [ ] `src/registry/installer.ts` - Download, checksum verification, installation
- [ ] `src/registry/config-manager.ts` - Load/save configuration

#### Phase 3B.2: CLI Commands (Week 1-2)
- [ ] `src/cli/commands/registry/add.ts` - Add registry to config
- [ ] `src/cli/commands/registry/list.ts` - List configured registries
- [ ] `src/cli/commands/registry/remove.ts` - Remove registry
- [ ] `src/cli/commands/registry/update.ts` - Update registry config
- [ ] `src/cli/commands/registry/refresh.ts` - Force refresh manifest cache
- [ ] `src/cli/commands/install.ts` - Install plugins/agents/tools
- [ ] `src/cli/commands/uninstall.ts` - Uninstall components
- [ ] `src/cli/commands/list.ts` - List installed components
- [ ] `src/cli/commands/search.ts` - Search registries
- [ ] `src/cli/commands/export.ts` - Export to other frameworks

#### Phase 3B.3: Export Functionality (Week 2)
- [ ] `src/export/exporters/langchain-exporter.ts` - Export to LangChain Python
- [ ] `src/export/exporters/claude-exporter.ts` - Export to Claude Code format
- [ ] `src/export/exporters/n8n-exporter.ts` - Export to n8n workflows
- [ ] `src/export/base-exporter.ts` - Base exporter interface
- [ ] `src/export/registry.ts` - Exporter registry

#### Phase 3B.4: Testing (Week 2-3)
- [ ] Unit tests for all resolvers (>90% coverage)
- [ ] Integration tests for CLI commands
- [ ] End-to-end test: install from registry
- [ ] Export tests for each format

**Dependencies:**
- Requires `fractary/forge-registry` to exist (can start with mock/fixture data)
- Requires `fractary/plugins` for testing installation

**Deliverables:**
- Working `forge install` command
- Working `forge registry` commands
- Working `forge export` command
- All tests passing

---

### 2.2 PROJECT: fractary/plugins (New Repository)

**Purpose:** Plugin repository with Fractary YAML definitions

**Specs:**
- SPEC-FORGE-007: Claude to Fractary Conversion Guide (use this as conversion reference)
- SPEC-FORGE-005: Plugin manifest format (sections 3.2 and 3.3)

**Work Items:**

#### Phase 1: Repository Setup (Day 1)
- [ ] Create `fractary/plugins` repository on GitHub
- [ ] Initialize with README.md explaining plugin structure
- [ ] Add LICENSE (MIT)
- [ ] Create `.github/workflows/` for CI/CD
- [ ] Set up automated manifest validation

#### Phase 2: FABER Plugin Conversion (Week 1)
**Source:** `fractary/claude-plugins/fractary-faber/`

- [ ] Create `plugins/faber-plugin/` directory structure
- [ ] Create `plugins/faber-plugin/plugin.json` manifest
- [ ] Convert 5 agents from Claude → Fractary YAML:
  - [ ] `agents/frame-agent.yaml`
  - [ ] `agents/architect-agent.yaml`
  - [ ] `agents/build-agent.yaml`
  - [ ] `agents/evaluate-agent.yaml`
  - [ ] `agents/release-agent.yaml`
- [ ] Convert 12 tools (skills) to Fractary YAML:
  - [ ] `tools/fetch_issue.yaml`
  - [ ] `tools/classify_work_type.yaml`
  - [ ] `tools/create_specification.yaml`
  - [ ] (and 9 more...)
- [ ] Convert hooks:
  - [ ] `hooks/faber-commit.js`
- [ ] Convert commands:
  - [ ] `commands/faber-run.md`
- [ ] Create workflows (new):
  - [ ] `workflows/faber-full-cycle.yaml`
- [ ] Create templates (new):
  - [ ] `templates/work-spec-template.yaml`
- [ ] Create `plugins/faber-plugin/README.md`

#### Phase 3: Work Plugin Conversion (Week 2)
**Source:** `fractary/claude-plugins/fractary-work/`

- [ ] Create `plugins/work-plugin/` directory structure
- [ ] Create `plugins/work-plugin/plugin.json` manifest
- [ ] Convert all agents, tools, hooks, commands to Fractary YAML
- [ ] Create README

#### Phase 4: Repo Plugin Conversion (Week 2)
**Source:** `fractary/claude-plugins/fractary-repo/`

- [ ] Create `plugins/repo-plugin/` directory structure
- [ ] Create `plugins/repo-plugin/plugin.json` manifest
- [ ] Convert all agents, tools, hooks, commands to Fractary YAML
- [ ] Create README

#### Phase 5: Spec Plugin Conversion (Week 3)
**Source:** `fractary/claude-plugins/fractary-spec/`

- [ ] Create `plugins/spec-plugin/` directory structure
- [ ] Create `plugins/spec-plugin/plugin.json` manifest
- [ ] Convert all agents, tools, hooks, commands to Fractary YAML
- [ ] Create README

**Dependencies:**
- Reference SPEC-FORGE-007 for conversion patterns
- Use `fractary/claude-plugins` as source material

**Deliverables:**
- 4 fully converted plugins in Fractary YAML format
- Each plugin with valid `plugin.json` manifest
- All manifests pass validation (CI/CD)

---

### 2.3 PROJECT: fractary/forge-registry (New Repository)

**Purpose:** Manifest-based registry for Phase 3B

**Specs:**
- SPEC-FORGE-005: Section 3.1 (Registry Manifest Schema)

**Work Items:**

#### Phase 1: Registry Setup (Day 1)
- [ ] Create `fractary/forge-registry` repository on GitHub
- [ ] Create `manifest.json` (registry manifest)
- [ ] Add schema validation in CI/CD
- [ ] Create README with registry documentation

#### Phase 2: Plugin References (Week 1)
- [ ] Add reference to `@fractary/faber-plugin`
- [ ] Add reference to `@fractary/work-plugin`
- [ ] Add reference to `@fractary/repo-plugin`
- [ ] Add reference to `@fractary/spec-plugin`

#### Phase 3: Checksums and URLs (Week 1)
- [ ] Generate SHA-256 checksums for all plugin manifests
- [ ] Set up raw.githubusercontent.com URLs for each plugin manifest
- [ ] Validate all URLs are accessible
- [ ] Update `manifest.json` with checksums and URLs

**Dependencies:**
- Requires `fractary/plugins` to exist with plugin.json files

**Deliverables:**
- Working `manifest.json` with 4 plugin references
- All checksums valid
- All URLs accessible
- Passes schema validation

**Example manifest.json:**
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
      "description": "FABER workflow methodology",
      "manifest_url": "https://raw.githubusercontent.com/fractary/plugins/main/plugins/faber-plugin/plugin.json",
      "homepage": "https://github.com/fractary/plugins/tree/main/plugins/faber-plugin",
      "repository": "https://github.com/fractary/plugins",
      "license": "MIT",
      "tags": ["faber", "workflow", "official"],
      "checksum": "sha256:abc123..."
    }
  ]
}
```

---

### 2.4 PROJECT: fractary/faber (Existing Repository)

**Purpose:** Orchestration layer - read Fractary YAML, execute workflows

**Current State:** Exists but may need updates to read Fractary YAML format

**Work Items:**

#### Phase 1: Assessment (Week 1)
- [ ] Review current FABER implementation
- [ ] Identify what needs updating to read Fractary YAML
- [ ] Document current vs. desired state

#### Phase 2: Fractary YAML Reader (Week 2)
- [ ] Implement Fractary YAML parser for agents
- [ ] Implement Fractary YAML parser for tools
- [ ] Implement Fractary YAML parser for workflows
- [ ] Implement Fractary YAML parser for templates

#### Phase 3: LangGraph Integration (Week 2-3)
- [ ] Update LangGraph integration to use Fractary YAML
- [ ] Ensure LangGraph is internal (not exposed to users)
- [ ] Test workflow execution with Fractary YAML agents

#### Phase 4: CLI Integration (Week 3)
- [ ] Ensure `forge faber run <issue>` works
- [ ] Integration with `fractary/forge` for agent resolution
- [ ] Test end-to-end: install from registry → execute with FABER

**Dependencies:**
- Requires `fractary/forge` to provide agent resolution
- Requires `fractary/plugins` for test data

**Deliverables:**
- FABER reads Fractary YAML natively
- LangGraph integration working
- `forge faber run` command works end-to-end

---

## 3. Implementation Sequence

### 3.1 Recommended Order

```
PHASE 1: Foundation (Week 1)
├─→ [forge] Start registry infrastructure (schemas, resolvers)
├─→ [plugins] Create repository and start FABER plugin conversion
└─→ [forge-registry] Create repository (can start with placeholder)

PHASE 2: Core Distribution (Week 1-2)
├─→ [plugins] Complete FABER plugin conversion (agents, tools, workflows)
├─→ [forge-registry] Add FABER plugin reference with checksums
├─→ [forge] Complete registry CLI commands (add, list, install)
└─→ [forge] Test install from registry

PHASE 3: Expand Plugins (Week 2)
├─→ [plugins] Convert Work, Repo, Spec plugins
├─→ [forge-registry] Add all plugin references
└─→ [forge] Complete export functionality

PHASE 4: Orchestration (Week 2-3)
├─→ [faber] Update to read Fractary YAML
├─→ [faber] LangGraph integration updates
└─→ [forge + faber] Integration testing

PHASE 5: End-to-End (Week 3)
├─→ [ALL] Integration testing across all projects
├─→ [ALL] Documentation updates
└─→ [ALL] Release preparation
```

### 3.2 Critical Path

**Day 1-2:**
1. Create `fractary/plugins` repository
2. Create `fractary/forge-registry` repository
3. Start FABER plugin conversion (at least 1 agent + 1 tool)
4. Implement basic registry schemas in `forge`

**Week 1:**
1. Complete FABER plugin conversion
2. Complete registry infrastructure in `forge`
3. Implement `forge install` command
4. Create `forge-registry/manifest.json` with FABER plugin

**Week 2:**
1. Convert Work, Repo, Spec plugins
2. Complete all CLI commands in `forge`
3. Implement export functionality
4. Start FABER Fractary YAML reader

**Week 3:**
1. Complete FABER integration
2. End-to-end testing
3. Documentation
4. Release

### 3.3 Parallel Work Opportunities

These can be done in parallel by different team members:

**Track 1 (Distribution):**
- `forge` registry infrastructure
- `forge` CLI commands
- `forge-registry` setup

**Track 2 (Plugins):**
- `plugins` conversions (one plugin at a time)
- Can work through all 4 plugins sequentially

**Track 3 (Orchestration):**
- `faber` assessment and updates
- Can start once FABER plugin has at least 1 agent converted

## 4. Testing Strategy

### 4.1 Per-Project Testing

**forge:**
- Unit tests for resolvers, installers, exporters
- Integration tests for CLI commands
- End-to-end tests with fixture registries

**plugins:**
- Schema validation for all YAML files
- Manifest validation for all plugin.json files
- CI/CD pipeline for automated validation

**forge-registry:**
- Schema validation for manifest.json
- Checksum validation
- URL accessibility checks

**faber:**
- Unit tests for YAML parsers
- Integration tests with LangGraph
- End-to-end workflow execution tests

### 4.2 Cross-Project Integration Tests

**Test 1: Install and Execute**
```bash
# From forge project
forge registry add fractary-core --url https://raw.githubusercontent.com/fractary/forge-registry/main/manifest.json
forge install @fractary/faber-plugin
forge faber run 123
# Should execute Frame → Release workflow
```

**Test 2: Export to LangChain**
```bash
forge install @fractary/faber-plugin
forge export langchain @fractary/faber-plugin --output ./langchain/
# Should create Python files for LangChain
```

**Test 3: Full Plugin Lifecycle**
```bash
forge search faber
forge install @fractary/faber-plugin@2.0.0
forge list --plugin @fractary/faber-plugin
forge faber run 123
forge uninstall @fractary/faber-plugin
```

## 5. Deliverables by Project

### forge (fractary/forge)
- [ ] Registry system with three-tier resolution
- [ ] CLI commands: `forge registry`, `forge install`, `forge export`
- [ ] Export to LangChain, Claude, n8n formats
- [ ] Comprehensive test suite (>90% coverage)
- [ ] Documentation updates

### plugins (fractary/plugins)
- [ ] 4 plugins converted to Fractary YAML format:
  - [ ] faber-plugin (5 agents, 12 tools, 1 workflow, 1 template, hooks, commands)
  - [ ] work-plugin (all components)
  - [ ] repo-plugin (all components)
  - [ ] spec-plugin (all components)
- [ ] Each plugin with valid `plugin.json` manifest
- [ ] CI/CD with automated validation
- [ ] README documentation for each plugin

### forge-registry (fractary/forge-registry)
- [ ] `manifest.json` with 4 plugin references
- [ ] All checksums and URLs valid
- [ ] CI/CD with schema validation
- [ ] Documentation for adding new plugins

### faber (fractary/faber)
- [ ] Fractary YAML parser (agents, tools, workflows, templates)
- [ ] LangGraph integration (internal)
- [ ] Integration with `forge` for agent resolution
- [ ] `forge faber run` command working
- [ ] Test suite for workflow execution

## 6. Migration from Current State

### 6.1 Current State
- `fractary/forge`: Active development, no registry system yet
- `fractary/faber`: Exists, may need updates for Fractary YAML
- `fractary/claude-plugins`: Source of truth for agent definitions (Claude format)
- No registry system exists

### 6.2 Migration Steps

**Step 1: Create new repositories**
- Create `fractary/plugins` (new home for Fractary YAML definitions)
- Create `fractary/forge-registry` (manifest-based registry)

**Step 2: Convert plugins**
- Use SPEC-FORGE-007 to convert claude-plugins → Fractary YAML
- Move converted plugins to `fractary/plugins`
- Keep `fractary/claude-plugins` as source for Claude Code users

**Step 3: Implement distribution**
- Implement registry system in `fractary/forge`
- Populate `fractary/forge-registry` with plugin references
- Test installation flow

**Step 4: Update orchestration**
- Update `fractary/faber` to read Fractary YAML
- Ensure backward compatibility if needed
- Test workflow execution

**Step 5: Coexistence**
- `fractary/claude-plugins`: Continue to maintain for Claude Code users
- `fractary/plugins`: Fractary YAML format for Forge ecosystem
- Use `forge export claude` to generate Claude Code format from Fractary

## 7. Success Criteria

### 7.1 Functional
- [ ] `forge install @fractary/faber-plugin` works end-to-end
- [ ] `forge faber run 123` executes FABER workflow
- [ ] `forge export langchain @fractary/faber-plugin` generates valid LangChain code
- [ ] All 4 plugins converted and available in registry
- [ ] All plugins validate against schemas

### 7.2 Architectural
- [ ] Fractary YAML is canonical format for distribution
- [ ] FABER reads Fractary YAML directly
- [ ] LangChain is internal to FABER (not exposed)
- [ ] Export to other frameworks works (optional)
- [ ] Three-tier resolution works (local → global → remote)

### 7.3 Quality
- [ ] >90% test coverage in forge
- [ ] All YAML files validate against schemas
- [ ] All manifests validate against schemas
- [ ] CI/CD passing in all repos
- [ ] Documentation complete

## 8. Open Questions

1. **FABER repository structure**: Does `fractary/faber` need restructuring to align with new architecture?
2. **Backward compatibility**: Should we maintain backward compatibility with existing FABER installations?
3. **Claude Code coexistence**: How do we maintain `fractary/claude-plugins` alongside `fractary/plugins`?
4. **Release versioning**: How do we version across 4 repositories?
5. **Monorepo consideration**: Should we consider a monorepo for forge + faber + plugins?

## 9. Next Steps

### Immediate (This Week)
1. **Create new repositories**: `fractary/plugins` and `fractary/forge-registry`
2. **Start FABER plugin conversion**: Convert at least frame-agent and fetch_issue tool
3. **Implement registry schemas**: Complete schemas in `fractary/forge`

### Week 2
1. **Complete FABER plugin**: All agents, tools, workflows, templates
2. **Implement CLI commands**: `forge registry`, `forge install`
3. **Create registry manifest**: Add FABER plugin to forge-registry

### Week 3
1. **Convert remaining plugins**: Work, Repo, Spec
2. **Implement export**: LangChain, Claude, n8n exporters
3. **Update FABER**: Fractary YAML reader

### Week 4
1. **Integration testing**: End-to-end across all projects
2. **Documentation**: Update all READMEs and guides
3. **Release**: v2.0.0 of all projects

## 10. References

- **SPEC-FORGE-005**: Registry Manifest System (forge project)
- **SPEC-FORGE-007**: Claude to Fractary Conversion Guide (plugins project)
- **WORK-00006**: Phase 3B Implementation (forge project)
- **Architecture Decision**: Fractary YAML as canonical format (documented in SPEC-FORGE-005 section 1.3)
