# SPEC-FORGE-008: Directory-Per-Definition Structure

**Status**: Approved
**Version**: 1.0.0
**Last Updated**: 2025-12-16
**Owner**: Fractary Team

---

## Overview

This specification defines the **directory-per-definition** structure for Fractary agent and tool definitions. This architecture enables modular, self-contained components with supporting resources grouped in dedicated directories.

### Motivation

The directory-per-definition pattern provides several key benefits:

1. **Resource Colocation**: Keep all related files (YAML definition, documentation, scripts, workflows) in one directory
2. **Better Organization**: Clear separation between components
3. **Support Files**: Enable documentation, context files, and helper scripts to live alongside definitions
4. **Consistency**: Follows Claude Code Skills pattern, providing familiar structure for developers
5. **Extensibility**: Easy to add new resource types without affecting the core definition

---

## Architecture

### Directory Structure

Each agent or tool has its own subdirectory containing:

```
agents/
├── {agent-name}/
│   ├── agent.yaml          # Required: Agent definition
│   ├── README.md           # Optional: Documentation
│   ├── docs/               # Optional: Additional context
│   ├── scripts/            # Optional: Helper scripts
│   └── examples/           # Optional: Usage examples

tools/
├── {tool-name}/
│   ├── tool.yaml           # Required: Tool definition
│   ├── README.md           # Optional: Documentation
│   ├── docs/               # Optional: Additional context
│   ├── scripts/            # Optional: Implementation scripts
│   ├── workflow/           # Optional: Workflow definitions
│   └── examples/           # Optional: Usage examples
```

### Standard File Names

| Component Type | Required File | Supporting Files |
|---------------|---------------|------------------|
| Agent | `agent.yaml` | README.md, docs/, scripts/, examples/ |
| Tool | `tool.yaml` | README.md, docs/, scripts/, workflow/, examples/ |

---

## Implementation

### Local Project Structure

Project-local definitions follow the directory-per-definition pattern:

```
.fractary/
├── agents/
│   ├── custom-agent/
│   │   └── agent.yaml
│   └── another-agent/
│       ├── agent.yaml
│       ├── README.md
│       └── docs/
│           └── context.md
└── tools/
    ├── custom-tool/
    │   └── tool.yaml
    └── helper-tool/
        ├── tool.yaml
        └── scripts/
            └── helper.sh
```

### Global Registry Structure

The global registry uses versioned directories:

```
~/.fractary/registry/
├── agents/
│   ├── frame-agent@1.0.0/
│   │   └── agent.yaml
│   ├── frame-agent@2.0.0/
│   │   ├── agent.yaml
│   │   └── README.md
│   └── architect-agent@1.0.0/
│       └── agent.yaml
└── tools/
    ├── bash-tool@1.0.0/
    │   └── tool.yaml
    └── fetch-issue@2.0.0/
        ├── tool.yaml
        └── scripts/
            └── fetch.sh
```

**Version Directory Pattern**: `{name}@{semver}/`

### Plugin Repository Structure

The [fractary/plugins](https://github.com/fractary/plugins) repository follows the same pattern:

```
plugins/
├── faber/
│   ├── agents/
│   │   ├── faber-manager/
│   │   │   ├── agent.yaml
│   │   │   └── README.md
│   │   └── faber-planner/
│   │       └── agent.yaml
│   └── tools/
│       ├── frame/
│       │   ├── tool.yaml
│       │   └── workflow/
│       │       └── basic.md
│       └── architect/
│           └── tool.yaml
├── repo/
│   ├── agents/
│   │   └── repo-manager/
│   │       └── agent.yaml
│   └── tools/
│       ├── branch-manager/
│       │   └── tool.yaml
│       └── commit-creator/
│           ├── tool.yaml
│           └── scripts/
│               └── commit.sh
└── work/
    ├── agents/
    │   └── work-manager/
    │       └── agent.yaml
    └── tools/
        ├── issue-creator/
        │   └── tool.yaml
        └── issue-fetcher/
            └── tool.yaml
```

---

## Resolution Algorithm

The Forge resolver supports directory-per-definition lookups in all three tiers:

### 1. Local Resolution

```typescript
// Lookup path: .fractary/agents/{name}/agent.yaml
path.join(process.cwd(), '.fractary', 'agents', name, 'agent.yaml')

// Lookup path: .fractary/tools/{name}/tool.yaml
path.join(process.cwd(), '.fractary', 'tools', name, 'tool.yaml')
```

### 2. Global Registry Resolution

```typescript
// Pattern: ~/.fractary/registry/agents/{name}@{version}/agent.yaml
const pattern = path.join(registryPath, `${name}@*`, 'agent.yaml');
const files = await glob(pattern);

// Extract version from directory name
const match = f.match(/([^/\\]+)@([\d.]+[^/\\]*)[/\\]agent\.yaml$/);
```

### 3. Remote Registry Resolution (Future)

Remote registries (Stockyard, GitHub) will use the same structure when downloading and caching definitions.

---

## Supporting Files

### README.md

Optional markdown documentation for the agent/tool:

```markdown
# Agent Name

Brief description.

## Overview

Detailed explanation of what this agent does.

## Tools

List of tools this agent uses.

## Examples

Usage examples.
```

### docs/ Directory

Additional context files that can be referenced in prompts:

```
docs/
├── architecture.md
├── api-reference.md
└── troubleshooting.md
```

These can be loaded and injected into agent context via `{{file:docs/architecture.md}}` patterns.

### scripts/ Directory

Helper scripts for tool implementations:

```
scripts/
├── validate.sh
├── process.py
└── helpers/
    └── common.sh
```

Tool YAML can reference these:

```yaml
implementation:
  type: bash
  bash:
    command: bash scripts/validate.sh
```

### workflow/ Directory

Workflow markdown files for complex operations:

```
workflow/
├── basic.md
├── advanced.md
└── error-handling.md
```

### examples/ Directory

Usage examples and test cases:

```
examples/
├── basic-usage.yaml
├── advanced-config.yaml
└── edge-cases.yaml
```

---

## Migration from Flat Structure

### Old Structure (Deprecated)

```
.fractary/
├── agents/
│   ├── agent-one.yaml
│   └── agent-two.yaml
└── tools/
    ├── tool-one.yaml
    └── tool-two.yaml
```

### New Structure (Current)

```
.fractary/
├── agents/
│   ├── agent-one/
│   │   └── agent.yaml
│   └── agent-two/
│       └── agent.yaml
└── tools/
    ├── tool-one/
    │   └── tool.yaml
    └── tool-two/
        └── tool.yaml
```

### Migration Script

```bash
#!/bin/bash
# migrate-to-directory-structure.sh

for yaml in .fractary/agents/*.yaml; do
  name=$(basename "$yaml" .yaml)
  mkdir -p ".fractary/agents/$name"
  mv "$yaml" ".fractary/agents/$name/agent.yaml"
done

for yaml in .fractary/tools/*.yaml; do
  name=$(basename "$yaml" .yaml)
  mkdir -p ".fractary/tools/$name"
  mv "$yaml" ".fractary/tools/$name/tool.yaml"
done
```

---

## Benefits

### 1. Modularity

Each component is self-contained with all its resources in one place.

### 2. Discoverability

Easy to browse and understand what resources belong to each component.

### 3. Extensibility

Adding new resource types (tests, configs, etc.) doesn't require schema changes.

### 4. Version Management

Version-specific resources (docs, scripts) stay with their definition version.

### 5. Consistency with Ecosystem

Matches Claude Code Skills pattern, making it familiar to developers.

---

## Trade-offs

### Advantages

- **Better Organization**: Clear separation of concerns
- **Resource Colocation**: All related files together
- **Extensibility**: Easy to add new file types
- **Familiarity**: Follows established patterns (Skills, npm packages)

### Disadvantages

- **More Directories**: Slightly more complex directory tree
- **Migration Required**: Existing flat structures need migration
- **Glob Patterns**: Slightly more complex glob patterns for discovery

### Decision

The advantages far outweigh the disadvantages. The directory-per-definition pattern is now the **canonical structure** for all Fractary definitions.

---

## Examples

### Minimal Agent

```
agents/simple-agent/
└── agent.yaml
```

### Fully-Featured Tool

```
tools/advanced-tool/
├── tool.yaml
├── README.md
├── docs/
│   ├── architecture.md
│   └── api.md
├── scripts/
│   ├── validate.sh
│   └── process.py
├── workflow/
│   ├── basic.md
│   └── advanced.md
└── examples/
    ├── simple.yaml
    └── complex.yaml
```

### Versioned Global Registry Entry

```
~/.fractary/registry/agents/faber-manager@2.0.0/
├── agent.yaml
├── README.md
└── docs/
    └── faber-methodology.md
```

---

## Implementation Status

### ✅ Completed

- [x] Resolver updated to support directory-per-definition
- [x] YAMLLoader supports arbitrary file paths
- [x] Global registry glob patterns updated
- [x] Local registry path resolution updated

### 🚧 In Progress

- [ ] Documentation updates across all specs
- [ ] Migration tooling for existing projects

### 📋 Planned

- [ ] CLI commands to scaffold new agents/tools with directory structure
- [ ] Validation tools to check directory structure compliance
- [ ] Template system for creating new definitions

---

## Related Specifications

- [SPEC-FORGE-001](./SPEC-FORGE-001-agent-tool-definition-system.md): Agent and Tool Definition System
- [SPEC-FORGE-005](./SPEC-FORGE-005-REGISTRY-MANIFEST-SYSTEM.md): Registry Manifest System
- [WORK-00006](./WORK-00006-phase-3b-faber-agent-definitions-implementation.md): Phase 3B Implementation

---

## Appendix

### A. Comparison with Other Ecosystems

| Ecosystem | Pattern | Example |
|-----------|---------|---------|
| **npm** | Directory per package | `node_modules/{package}/` |
| **Python** | Directory per module | `site-packages/{module}/` |
| **Claude Skills** | Directory per skill | `.claude/skills/{skill}/SKILL.md` |
| **Fractary** | Directory per definition | `.fractary/agents/{agent}/agent.yaml` |

### B. Future Extensions

Potential future additions to definition directories:

- **tests/**: Unit tests for the component
- **config/**: Configuration schemas
- **locale/**: Internationalization files
- **assets/**: Images, diagrams, etc.
- **templates/**: Reusable templates

---

**Document Version**: 1.0.0
**Approved By**: Fractary Architecture Team
**Implementation Date**: 2025-12-16
