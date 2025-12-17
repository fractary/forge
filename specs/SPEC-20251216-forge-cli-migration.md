---
spec_id: spec-20251216-forge-cli-migration
title: Migrate Forge CLI from fractary/cli to /cli/
type: feature
status: draft
created: 2025-12-16
refined: 2025-12-16
author: claude
validated: false
related:
  - SPEC-00026-distributed-plugin-architecture
---

# Feature Specification: Migrate Forge CLI from fractary/cli to /cli/

**Type**: Feature
**Status**: Draft
**Created**: 2025-12-16

## Summary

Migrate all forge-related CLI commands from the parallel `fractary/cli` project (`/mnt/c/GitHub/fractary/cli/src/tools/forge/`) into this forge project's `/cli/` directory. The CLI will be packaged as `@fractary/forge-cli` with the binary command `fractary-forge`, creating a focused, standalone CLI tool for forge-related operations.

**Scope**: 52 TypeScript files (~10,915 LOC)
- 23 active commands (5 core + 18 registry)
- 12 utility modules
- SDK wrappers and configuration management
- Tests and test fixtures

## User Stories

### CLI User Experience
**As a** developer using Fractary Forge
**I want** a dedicated CLI tool (`fractary-forge`) for forge operations
**So that** I can manage agents, tools, and registry operations without needing the full Fractary CLI

**Acceptance Criteria**:
- [ ] `fractary-forge --help` displays all available commands
- [ ] `fractary-forge init` creates forge configuration
- [ ] All 23 commands are accessible via `fractary-forge <command>`

### Developer Experience
**As a** CLI package maintainer
**I want** the forge CLI to be a separate npm package with its own versioning
**So that** I can publish and maintain it independently from the SDK

**Acceptance Criteria**:
- [ ] `/cli/package.json` defines `@fractary/forge-cli` package
- [ ] Supports both workspace (local) and npm (published) SDK dependency
- [ ] Tests pass independently in the `/cli/` directory

## Functional Requirements

- **FR1**: Migrate all 23 active commands from source CLI to `/cli/src/commands/`
- **FR2**: Migrate all 12 utility modules to `/cli/src/utils/`
- **FR3**: Migrate ForgeClient wrapper and singleton pattern to `/cli/src/client/`
- **FR4**: Migrate configuration types and YAML I/O to `/cli/src/config/`
- **FR5**: Create binary entry point at `/cli/bin/fractary-forge.ts`
- **FR6**: Migrate all tests to `/cli/tests/`
- **FR7**: Support SDK dependency via both workspace protocol (dev) and npm (production)

## Non-Functional Requirements

- **NFR1**: Node.js >= 18.0.0 requirement (compatibility)
- **NFR2**: TypeScript strict mode enabled (quality)
- **NFR3**: All tests must pass after migration (quality)
- **NFR4**: ESLint and Prettier must run cleanly (quality)
- **NFR5**: Build must produce clean dist/ output (reliability)

## Technical Design

### Architecture Changes

**Before**: Forge commands lived as a "tool" inside the unified `fractary/cli` project at `/src/tools/forge/`

**After**: Forge commands become a standalone CLI package at `/cli/` within the forge project:
- Independent `package.json` with `@fractary/forge-cli` name
- Binary entry point `fractary-forge`
- Uses `@fractary/forge` SDK via workspace protocol (dev) or npm (production)
- TypeScript project references for type safety with SDK

### Project Structure

```
/cli/
├── package.json              # @fractary/forge-cli
├── tsconfig.json             # Extends SDK, project references
├── README.md
├── bin/
│   └── fractary-forge.ts     # Entry point
├── src/
│   ├── index.ts              # Main CLI program
│   ├── client/
│   │   ├── forge-client.ts   # SDK wrapper
│   │   └── get-client.ts     # Singleton factory
│   ├── commands/
│   │   ├── init.ts
│   │   ├── agent/            # 4 agent commands
│   │   └── registry/         # 18 registry commands + index
│   ├── utils/                # 12 utility modules
│   ├── config/               # Config types and I/O
│   └── types/
└── tests/
```

### Dependencies

**New Dependencies**:
- `commander` ^11.1.0 - CLI framework
- `inquirer` ^9.2.12 - Interactive prompts
- `cli-table3` ^0.6.5 - Table formatting
- `prompts` ^2.4.2 - Simple prompts
- `ajv` ^8.12.0 - JSON schema validation

**Shared with SDK**:
- `chalk` ^4.1.2 - CLI colors
- `ora` ^5.4.1 - Spinners
- `js-yaml` ^4.1.0 - YAML parsing
- `glob` ^10.3.0 - File patterns
- `fs-extra` ^11.2.0 - File system utilities

**SDK Dependency**:
```json
{
  "@fractary/forge": "workspace:* || ^1.1.2"
}
```

### Data Model

No database changes. Configuration file format remains unchanged:
- `.fractary/forge/config.yaml` - Project configuration
- `.fractary/forge/lockfile.json` - Dependency lockfile

### API Design

CLI commands (not REST API):

- `fractary-forge init` - Initialize forge configuration
- `fractary-forge agent-create` - Create agent definition
- `fractary-forge agent-info <name>` - Get agent information
- `fractary-forge agent-list` - List available agents
- `fractary-forge agent-validate <name>` - Validate agent definition
- `fractary-forge install <plugin>` - Install from registry
- `fractary-forge uninstall <plugin>` - Uninstall plugin
- `fractary-forge list` - List installed plugins
- `fractary-forge info <plugin>` - Plugin information
- `fractary-forge search <query>` - Search registry
- `fractary-forge lock` - Lock plugin versions
- `fractary-forge update` - Update plugins
- `fractary-forge fork <source>` - Fork component
- `fractary-forge merge` - Merge upstream changes
- `fractary-forge login` - Authenticate with registry
- `fractary-forge logout` - Clear authentication
- `fractary-forge whoami` - Show current user
- `fractary-forge cache clear` - Clear registry cache
- `fractary-forge cache stats` - Cache statistics
- `fractary-forge registry add <url>` - Add registry source
- `fractary-forge registry list` - List registries
- `fractary-forge registry remove <name>` - Remove registry

### UI/UX Changes

- CLI binary changes from `fractary forge <cmd>` to `fractary-forge <cmd>`
- All command behavior remains identical
- Help text and error messages preserved

## Implementation Plan

### Phase 1: Initialize CLI Package Structure
**Status**: ⬜ Not Started

**Objective**: Create the package foundation

**Tasks**:
- [ ] Create `/cli/` directory and subdirectories
- [ ] Create `/cli/package.json` with correct configuration
- [ ] Create `/cli/tsconfig.json` extending SDK config
- [ ] Create `/cli/.gitignore`
- [ ] Create `/cli/README.md` placeholder

**Estimated Scope**: Small

### Phase 2: Setup Binary Entry Point
**Status**: ⬜ Not Started

**Objective**: Create executable entry point

**Tasks**:
- [ ] Create `/cli/bin/` directory
- [ ] Create `/cli/bin/fractary-forge.ts` with shebang and dynamic import

**Estimated Scope**: Small

### Phase 3: Migrate Core Infrastructure
**Status**: ⬜ Not Started

**Objective**: Migrate main CLI program

**Tasks**:
- [ ] Copy `/src/tools/forge/index.ts` → `/cli/src/index.ts`
- [ ] Remove multi-tool structure (faber, codex, helm references)
- [ ] Update program name from 'forge' to main program
- [ ] Update imports to use relative paths and `@fractary/forge`

**Estimated Scope**: Medium

### Phase 4: Migrate Client & Configuration
**Status**: ⬜ Not Started

**Objective**: Migrate SDK wrappers and config management

**Tasks**:
- [ ] Copy `client.ts` → `/cli/src/client/forge-client.ts`
- [ ] Copy `get-client.ts` → `/cli/src/client/get-client.ts`
- [ ] Copy `config-types.ts` → `/cli/src/config/config-types.ts`
- [ ] Copy `migrate-config.ts` → `/cli/src/config/migrate-config.ts`
- [ ] Update all imports

**Estimated Scope**: Medium

### Phase 5: Migrate Core Commands
**Status**: ⬜ Not Started

**Objective**: Migrate 5 core commands

**Tasks**:
- [ ] Copy `init.ts` → `/cli/src/commands/init.ts`
- [ ] Create `/cli/src/commands/agent/` directory
- [ ] Copy `agent-create.ts` → `agent/create.ts`
- [ ] Copy `agent-info.ts` → `agent/info.ts`
- [ ] Copy `agent-list.ts` → `agent/list.ts`
- [ ] Copy `agent-validate.ts` → `agent/validate.ts`
- [ ] Update imports and exports

**Estimated Scope**: Medium

### Phase 6: Migrate Registry Commands
**Status**: ⬜ Not Started

**Objective**: Migrate 18 registry commands

**Tasks**:
- [ ] Create `/cli/src/commands/registry/` directory
- [ ] Copy all 18 registry command files
- [ ] Copy `registry/index.ts` (command aggregator)
- [ ] Update imports in all files
- [ ] Verify command registration

**Estimated Scope**: Large

### Phase 7: Migrate Utilities
**Status**: ⬜ Not Started

**Objective**: Migrate 12 utility modules

**Tasks**:
- [ ] Create `/cli/src/utils/` directory
- [ ] Copy all 12 utility files (auth-manager, cache-manager, component-differ, credential-storage, forge-config, fork-manager, formatters, lockfile-manager, merge-manager, output-formatter, update-checker, validation-reporter)
- [ ] Update SDK imports
- [ ] Update relative imports for config types

**Estimated Scope**: Medium

### Phase 8: Migrate Tests
**Status**: ⬜ Not Started

**Objective**: Migrate all test files

**Tasks**:
- [ ] Create `/cli/tests/` directory structure
- [ ] Copy all test files from source
- [ ] Update test imports
- [ ] Configure jest.config.js
- [ ] Verify tests pass

**Estimated Scope**: Medium

### Phase 9: Install Dependencies & Build
**Status**: ⬜ Not Started

**Objective**: Verify build system works

**Tasks**:
- [ ] Run `npm install` in `/cli/`
- [ ] Verify workspace dependency resolution
- [ ] Run `npm run build`
- [ ] Verify `/cli/dist/` created correctly
- [ ] Set executable permissions on binary

**Estimated Scope**: Small

### Phase 10: Test Binary & Commands
**Status**: ⬜ Not Started

**Objective**: Verify CLI works correctly

**Tasks**:
- [ ] Test `fractary-forge --help`
- [ ] Test `fractary-forge --version`
- [ ] Test each command's help output
- [ ] Test `init` command creates config
- [ ] Run full test suite

**Estimated Scope**: Medium

### Phase 11: Create Documentation
**Status**: ⬜ Not Started

**Objective**: Write CLI documentation

**Tasks**:
- [ ] Write comprehensive `/cli/README.md`
- [ ] Add command reference for all 23 commands
- [ ] Add configuration guide
- [ ] Add examples
- [ ] Update root `/README.md`

**Estimated Scope**: Medium

### Phase 12: Final Verification & Cleanup
**Status**: ⬜ Not Started

**Objective**: Final quality checks

**Tasks**:
- [ ] Verify all imports resolve correctly
- [ ] Check no old CLI project path references
- [ ] Run linter: `npm run lint`
- [ ] Run formatter: `npm run format`
- [ ] Create `.npmignore` for clean publishing

**Estimated Scope**: Small

## Files to Create/Modify

### New Files

- `/cli/package.json`: CLI package configuration
- `/cli/tsconfig.json`: TypeScript configuration
- `/cli/.gitignore`: Git ignore patterns
- `/cli/.npmignore`: NPM ignore patterns
- `/cli/README.md`: CLI documentation
- `/cli/bin/fractary-forge.ts`: Binary entry point
- `/cli/src/index.ts`: Main CLI program
- `/cli/src/client/forge-client.ts`: SDK wrapper
- `/cli/src/client/get-client.ts`: Singleton factory
- `/cli/src/config/config-types.ts`: Config type definitions
- `/cli/src/config/migrate-config.ts`: Config I/O
- `/cli/src/commands/init.ts`: Init command
- `/cli/src/commands/agent/create.ts`: Agent create command
- `/cli/src/commands/agent/info.ts`: Agent info command
- `/cli/src/commands/agent/list.ts`: Agent list command
- `/cli/src/commands/agent/validate.ts`: Agent validate command
- `/cli/src/commands/registry/*.ts`: 18 registry commands + index
- `/cli/src/utils/*.ts`: 12 utility modules
- `/cli/src/types/index.ts`: CLI-specific types
- `/cli/tests/**/*.ts`: Test files

### Modified Files

- `/README.md`: Add CLI section with installation instructions

## Testing Strategy

### Unit Tests
- Test each utility module independently
- Test configuration parsing and validation
- Test output formatters

### Integration Tests
- Test `init` command creates valid config
- Test agent commands interact correctly with SDK
- Test registry commands with mock registry

### E2E Tests
- Test full CLI binary execution
- Test command help outputs
- Test error handling and exit codes

### Performance Tests
N/A - CLI startup time should be reasonable but not performance critical

## Dependencies

- `@fractary/forge` SDK v1.1.2+ (provides DefinitionResolver, AgentAPI, ToolAPI, Registry)
- commander.js v11.1.0+ for CLI framework
- Node.js v18.0.0+ runtime

## Risks and Mitigations

- **Risk**: Import path mismatches after migration
  - **Likelihood**: Medium
  - **Impact**: Medium (build failures)
  - **Mitigation**: Systematic import updates in each phase, TypeScript catches missing imports

- **Risk**: Workspace protocol not supported by all package managers
  - **Likelihood**: Low
  - **Impact**: Medium (dev setup issues)
  - **Mitigation**: Use fallback syntax `workspace:* || ^1.1.2`

- **Risk**: Tests fail due to changed file structure
  - **Likelihood**: Medium
  - **Impact**: Low (test updates needed)
  - **Mitigation**: Update test imports systematically in Phase 8

## Documentation Updates

- `/cli/README.md`: Full CLI documentation (new)
- `/README.md`: Add CLI installation and usage section (update)

## Rollout Plan

1. Complete all 12 implementation phases
2. Verify all tests pass
3. Test CLI locally with real forge projects
4. Merge to main branch
5. (Future) Publish to npm as `@fractary/forge-cli`

## Success Metrics

- All 52 files successfully migrated: Target 52/52
- All 23 commands functional: Target 23/23
- Test coverage maintained: Target >80%
- Build time: Target <30 seconds
- Binary startup time: Target <1 second

## Implementation Notes

### Key Configuration Files

**package.json**:
```json
{
  "name": "@fractary/forge-cli",
  "version": "1.0.0",
  "bin": {
    "fractary-forge": "dist/bin/fractary-forge.js"
  },
  "dependencies": {
    "@fractary/forge": "workspace:* || ^1.1.2"
  }
}
```

**tsconfig.json**:
```json
{
  "extends": "../sdk/js/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "references": [
    { "path": "../sdk/js" }
  ]
}
```

**Binary entry point**:
```typescript
#!/usr/bin/env node
import('../dist/index.js')
  .then(({ main }) => main())
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
```

### Files NOT to Migrate
- 13 disabled legacy commands in `.disabled/` folder
- Old BaseCommand architecture
- Any faber/codex/helm related code from parent CLI

## Future Enhancements (Post-Migration)

The following enhancements align with [SPEC-00026: Distributed Plugin Architecture](/specs/SPEC-00026-distributed-plugin-architecture.md) and should be considered after the core migration is complete.

### Phase 13: Tool Commands (New)
**Priority**: High
**Rationale**: SDK provides ToolAPI symmetric with AgentAPI, CLI should expose both

**Tasks**:
- [ ] Add `fractary-forge tool-create` - Create new tool definition
- [ ] Add `fractary-forge tool-info <name>` - Get tool information
- [ ] Add `fractary-forge tool-list` - List available tools
- [ ] Add `fractary-forge tool-validate <name>` - Validate tool definition

**Commands added**: 4

### Phase 14: Export Commands (New)
**Priority**: Medium
**Rationale**: SPEC-00026 Section 3.6 identifies Forge as providing translation tools for explicit format conversion

**Tasks**:
- [ ] Add `fractary-forge export langchain <agent>` - Export to LangChain Python format
- [ ] Add `fractary-forge export claude-code <agent>` - Export to Claude Code markdown format
- [ ] Add `fractary-forge export n8n <agent>` - Export to n8n workflow JSON format
- [ ] Use SDK Exporters module (LangChainExporter, ClaudeExporter, N8nExporter)

**Commands added**: 3 (with subcommand variations)

### Phase 15: MCP Server (New Package)
**Priority**: Low (separate package)
**Rationale**: SPEC-00026 Section 3.12 Package Matrix shows `@fractary/forge-mcp-server` as part of the complete ecosystem

**Tasks**:
- [ ] Create `/mcp-server/` directory structure
- [ ] Create `/mcp-server/package.json` for `@fractary/forge-mcp-server`
- [ ] Expose SDK functionality as MCP tools:
  - `fractary_forge_agent_create` - Create agent definition
  - `fractary_forge_agent_info` - Get agent information
  - `fractary_forge_tool_create` - Create tool definition
  - `fractary_forge_install` - Install from registry
  - `fractary_forge_export` - Export to framework format
- [ ] Document MCP server configuration

**Note**: This is a separate npm package, not part of CLI migration

## Architecture Alignment

This CLI migration aligns with the broader Fractary architecture as defined in SPEC-00026:

### Naming Convention Compliance
Per SPEC-00026 Section 3.9:
- **npm package (CLI)**: `@fractary/forge-cli` ✅
- **CLI binary**: `fractary-forge` ✅
- **Plugin commands**: `/fractary-forge:{action}` (for future plugin integration)

### Package Matrix Position
Per SPEC-00026 Section 3.12:

| Component | Package Name | Status |
|-----------|--------------|--------|
| SDK | `@fractary/forge` | ✅ Exists at `/sdk/js/` |
| CLI | `@fractary/forge-cli` | 🔄 This migration |
| MCP Server | `@fractary/forge-mcp-server` | 📋 Phase 15 (future) |

### Forge's Role in Architecture
Per SPEC-00026 Section 3.6 and 3.8:
- **Forge** provides creation tools for any framework + optional translation
- **CLI** exposes SDK functionality for command-line users and CI/CD
- **Export commands** implement the "optional translation tools" described in architecture

## Changelog

### 2025-12-16 (Refinement Round 1)
- Added Future Enhancements section (Phases 13-15)
- Added Architecture Alignment section referencing SPEC-00026
- Added tool commands (tool-create, tool-info, tool-list, tool-validate) to roadmap
- Added export commands (export langchain, export claude-code, export n8n) to roadmap
- Added MCP server (`@fractary/forge-mcp-server`) to roadmap as future package
- Updated command count from 23 to 30 (including future phases)
