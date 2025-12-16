# SPEC-CLI-001: Forge Commands for Fractary CLI

**Status**: Planned
**Version**: 1.0.0
**Created**: 2025-12-16
**Owner**: Fractary Team
**Target Project**: [fractary/cli](https://github.com/fractary/cli)
**Depends On**: @fractary/forge@1.1.2+ (Registry SDK)

---

## Overview

This specification defines the CLI commands that need to be implemented in the **fractary/cli** project to expose the Forge registry system to end users. The underlying SDK functionality is already implemented in **@fractary/forge@1.1.2** via the Registry module.

### Purpose

Enable users to:
- Manage registry sources for plugin distribution
- Install plugins from registries
- List installed components (agents, tools)
- Export plugins to different formats
- Search and discover available plugins

---

## Architecture

### Component Separation

```
┌─────────────────────────────────────────────┐
│  fractary/cli                                │
│  - Command parsing (commander/yargs)        │
│  - User interaction (prompts, spinners)     │
│  - Output formatting (tables, colors)       │
│  - Error display                            │
└─────────────────────────────────────────────┘
                    ↓
         Uses @fractary/forge SDK
                    ↓
┌─────────────────────────────────────────────┐
│  @fractary/forge (v1.1.2)                   │
│  - Registry.resolver                        │
│  - Registry.installer                       │
│  - Registry.cache                           │
│  - Registry.configManager                   │
│  - Exporters (LangChain, Claude, n8n)       │
└─────────────────────────────────────────────┘
```

**Key Point**: The CLI project is a **thin wrapper** around the Forge SDK. All business logic is in @fractary/forge.

---

## Commands to Implement

### 1. Registry Management Commands

#### `forge registry add`

Add a registry source.

**Syntax**:
```bash
forge registry add <name> <url> [options]
```

**Arguments**:
- `name` (string, required): Registry identifier (e.g., "fractary-official")
- `url` (string, required): Registry manifest URL

**Options**:
- `--priority <number>`: Priority (1-100, higher = higher priority)
- `--ttl <seconds>`: Cache TTL in seconds (default: 3600)
- `--disabled`: Add but keep disabled

**Examples**:
```bash
# Add official Fractary registry
forge registry add fractary-official \
  https://github.com/fractary/plugins/raw/main/registry.json

# Add with custom priority
forge registry add my-org https://git.company.com/fractary/registry.json \
  --priority 90

# Add but keep disabled
forge registry add test-registry https://example.com/registry.json \
  --disabled
```

**SDK Usage**:
```typescript
import { Registry } from '@fractary/forge';

const configManager = new Registry.configManager();
await configManager.addRegistry({
  name: args.name,
  url: args.url,
  enabled: !options.disabled,
  priority: options.priority || 50,
  cache_ttl: options.ttl || 3600
});
```

**Output**:
```
✓ Registry 'fractary-official' added successfully
  URL: https://github.com/fractary/plugins/raw/main/registry.json
  Priority: 50
  Cache TTL: 3600s

Run 'forge registry sync' to fetch available plugins.
```

---

#### `forge registry list`

List all configured registries.

**Syntax**:
```bash
forge registry list [options]
```

**Options**:
- `--enabled-only`: Show only enabled registries
- `--json`: Output as JSON

**Examples**:
```bash
forge registry list
forge registry list --enabled-only
forge registry list --json
```

**SDK Usage**:
```typescript
import { Registry } from '@fractary/forge';

const configManager = new Registry.configManager();
const config = await configManager.loadConfig();
const registries = config.registries;
```

**Output** (table format):
```
Configured Registries:

┌──────────────────┬──────────────────────────────┬──────────┬─────────┬──────────┐
│ Name             │ URL                          │ Priority │ Enabled │ Plugins  │
├──────────────────┼──────────────────────────────┼──────────┼─────────┼──────────┤
│ fractary-official│ https://github.com/...       │ 50       │ ✓       │ 9        │
│ my-org           │ https://git.company.com/...  │ 90       │ ✓       │ 3        │
│ test-registry    │ https://example.com/...      │ 50       │ ✗       │ -        │
└──────────────────┴──────────────────────────────┴──────────┴─────────┴──────────┘

Total: 3 registries (2 enabled)
```

---

#### `forge registry remove`

Remove a registry source.

**Syntax**:
```bash
forge registry remove <name>
```

**Arguments**:
- `name` (string, required): Registry name to remove

**Examples**:
```bash
forge registry remove test-registry
```

**SDK Usage**:
```typescript
import { Registry } from '@fractary/forge';

const configManager = new Registry.configManager();
await configManager.removeRegistry(args.name);
```

**Output**:
```
✓ Registry 'test-registry' removed
```

---

#### `forge registry sync`

Fetch latest manifests from all enabled registries.

**Syntax**:
```bash
forge registry sync [options]
```

**Options**:
- `--force`: Bypass cache, force refresh
- `--registry <name>`: Sync only specific registry

**Examples**:
```bash
forge registry sync
forge registry sync --force
forge registry sync --registry fractary-official
```

**SDK Usage**:
```typescript
import { Registry } from '@fractary/forge';

const resolver = new Registry.ManifestResolver();
await resolver.syncRegistries({
  force: options.force,
  registryName: options.registry
});
```

**Output**:
```
Syncing registries...

fractary-official
  ✓ Fetched registry manifest (9 plugins)
  ✓ Cache updated

my-org
  ✓ Fetched registry manifest (3 plugins)
  ✓ Cache updated

Sync complete. 12 plugins available across 2 registries.
```

---

### 2. Plugin Installation Commands

#### `forge install`

Install a plugin from a registry.

**Syntax**:
```bash
forge install <plugin> [options]
```

**Arguments**:
- `plugin` (string, required): Plugin identifier (e.g., "@fractary/faber-plugin", "@fractary/faber-plugin@2.0.0")

**Options**:
- `--global`: Install to global registry (~/.fractary/registry/)
- `--local`: Install to project (.fractary/)
- `--agents <list>`: Install only specific agents (comma-separated)
- `--tools <list>`: Install only specific tools (comma-separated)
- `--dry-run`: Show what would be installed without installing
- `--force`: Reinstall even if already installed

**Examples**:
```bash
# Install latest version globally
forge install @fractary/faber-plugin --global

# Install specific version to project
forge install @fractary/faber-plugin@2.0.0 --local

# Install only specific agents
forge install @fractary/faber-plugin --agents faber-manager,faber-planner

# Install specific tools
forge install @fractary/repo-plugin --tools branch-manager,commit-creator

# Dry run to preview
forge install @fractary/faber-plugin --dry-run
```

**SDK Usage**:
```typescript
import { Registry } from '@fractary/forge';

const installer = new Registry.Installer();
const result = await installer.install({
  package: args.plugin,
  location: options.global ? 'global' : 'local',
  components: {
    agents: options.agents?.split(','),
    tools: options.tools?.split(',')
  },
  dryRun: options.dryRun,
  force: options.force
});
```

**Output** (normal):
```
Installing @fractary/faber-plugin@2.0.0...

✓ Resolved from registry 'fractary-official'
✓ Downloaded plugin manifest
✓ Validated checksums

Installing components:
  Agents:
    ✓ faber-manager@2.0.0
    ✓ faber-planner@2.0.0
  Tools:
    ✓ frame@2.0.0
    ✓ architect@2.0.0
    ✓ build@2.0.0
    ✓ evaluate@2.0.0
    ✓ release@2.0.0

Installation complete!
  Location: ~/.fractary/registry/@fractary/faber-plugin@2.0.0/
  Agents: 2
  Tools: 5

Usage:
  forge list agents
  forge info @fractary/faber-plugin
```

**Output** (dry run):
```
Dry run: @fractary/faber-plugin@2.0.0

Would install to: ~/.fractary/registry/@fractary/faber-plugin@2.0.0/

Components to install:
  Agents (2):
    - faber-manager@2.0.0
    - faber-planner@2.0.0
  Tools (5):
    - frame@2.0.0
    - architect@2.0.0
    - build@2.0.0
    - evaluate@2.0.0
    - release@2.0.0

Total size: ~150 KB

Run without --dry-run to install.
```

---

#### `forge uninstall`

Uninstall a plugin.

**Syntax**:
```bash
forge uninstall <plugin> [options]
```

**Arguments**:
- `plugin` (string, required): Plugin identifier

**Options**:
- `--global`: Uninstall from global registry
- `--local`: Uninstall from project

**Examples**:
```bash
forge uninstall @fractary/faber-plugin --global
```

**SDK Usage**:
```typescript
import { Registry } from '@fractary/forge';

const installer = new Registry.Installer();
await installer.uninstall({
  package: args.plugin,
  location: options.global ? 'global' : 'local'
});
```

**Output**:
```
Uninstalling @fractary/faber-plugin@2.0.0...

✓ Removed 2 agents
✓ Removed 5 tools
✓ Cleaned up plugin directory

Uninstallation complete.
```

---

### 3. Discovery & Information Commands

#### `forge list`

List installed plugins and components.

**Syntax**:
```bash
forge list [type] [options]
```

**Arguments**:
- `type` (optional): Filter by type ("plugins", "agents", "tools")

**Options**:
- `--global`: Show global installations only
- `--local`: Show project installations only
- `--json`: Output as JSON

**Examples**:
```bash
forge list                # List all
forge list plugins        # List plugins
forge list agents         # List agents
forge list tools          # List tools
forge list agents --global
```

**SDK Usage**:
```typescript
import { Registry } from '@fractary/forge';

const installer = new Registry.Installer();
const installed = await installer.listInstalled({
  type: args.type,
  location: options.global ? 'global' : options.local ? 'local' : 'both'
});
```

**Output** (list plugins):
```
Installed Plugins:

┌─────────────────────────┬─────────┬────────┬──────────┬───────┐
│ Plugin                  │ Version │ Agents │ Tools    │ Loc   │
├─────────────────────────┼─────────┼────────┼──────────┼───────┤
│ @fractary/faber-plugin  │ 2.0.0   │ 2      │ 5        │ G     │
│ @fractary/repo-plugin   │ 2.0.0   │ 1      │ 15       │ G     │
│ @fractary/work-plugin   │ 2.0.0   │ 1      │ 19       │ L     │
└─────────────────────────┴─────────┴────────┴──────────┴───────┘

Legend: G=Global, L=Local
Total: 3 plugins (2 global, 1 local)
```

**Output** (list agents):
```
Installed Agents:

┌─────────────────┬─────────┬───────────────────────────┬───────┐
│ Agent           │ Version │ Plugin                    │ Loc   │
├─────────────────┼─────────┼───────────────────────────┼───────┤
│ faber-manager   │ 2.0.0   │ @fractary/faber-plugin    │ G     │
│ faber-planner   │ 2.0.0   │ @fractary/faber-plugin    │ G     │
│ repo-manager    │ 2.0.0   │ @fractary/repo-plugin     │ G     │
│ work-manager    │ 2.0.0   │ @fractary/work-plugin     │ L     │
└─────────────────┴─────────┴───────────────────────────┴───────┘

Total: 4 agents
```

---

#### `forge search`

Search for plugins in configured registries.

**Syntax**:
```bash
forge search <query> [options]
```

**Arguments**:
- `query` (string, required): Search term

**Options**:
- `--type <type>`: Filter by type ("plugin", "agent", "tool")
- `--registry <name>`: Search only in specific registry

**Examples**:
```bash
forge search faber
forge search "source control" --type plugin
forge search commit --type tool
```

**SDK Usage**:
```typescript
import { Registry } from '@fractary/forge';

const resolver = new Registry.ManifestResolver();
const results = await resolver.search({
  query: args.query,
  type: options.type,
  registry: options.registry
});
```

**Output**:
```
Search results for "faber":

Plugins (1):
  @fractary/faber-plugin v2.0.0
    Description: FABER workflow methodology for software development
    Registry: fractary-official
    Agents: 2  Tools: 5

Agents (2):
  faber-manager v2.0.0
    Description: Universal FABER workflow manager
    Plugin: @fractary/faber-plugin

  faber-planner v2.0.0
    Description: Creates FABER execution plans
    Plugin: @fractary/faber-plugin

Install: forge install @fractary/faber-plugin
```

---

#### `forge info`

Show detailed information about a plugin.

**Syntax**:
```bash
forge info <plugin> [options]
```

**Arguments**:
- `plugin` (string, required): Plugin identifier

**Options**:
- `--json`: Output as JSON

**Examples**:
```bash
forge info @fractary/faber-plugin
forge info @fractary/faber-plugin --json
```

**SDK Usage**:
```typescript
import { Registry } from '@fractary/forge';

const resolver = new Registry.ManifestResolver();
const info = await resolver.getPluginInfo(args.plugin);
```

**Output**:
```
@fractary/faber-plugin v2.0.0

Description:
  FABER workflow methodology for software development
  (Frame, Architect, Build, Evaluate, Release)

Registry: fractary-official
Author: Fractary Team
License: MIT
Repository: https://github.com/fractary/plugins

Agents (2):
  - faber-manager v2.0.0
    Universal FABER workflow manager

  - faber-planner v2.0.0
    Creates FABER execution plans

Tools (5):
  - frame v2.0.0
    Frame requirements and classify work
  - architect v2.0.0
    Design technical architecture
  - build v2.0.0
    Implement code and features
  - evaluate v2.0.0
    Validate and test implementation
  - release v2.0.0
    Create pull requests and deploy

Installation:
  Global: forge install @fractary/faber-plugin --global
  Local:  forge install @fractary/faber-plugin --local

Status: ✗ Not installed
```

---

### 4. Export Commands

#### `forge export`

Export plugin to framework-specific format.

**Syntax**:
```bash
forge export <plugin> --format <format> [options]
```

**Arguments**:
- `plugin` (string, required): Plugin identifier

**Options**:
- `--format <format>` (required): Export format ("langchain", "claude", "n8n")
- `--output <path>`: Output directory (default: current directory)
- `--agents <list>`: Export only specific agents
- `--tools <list>`: Export only specific tools

**Examples**:
```bash
# Export to LangChain format
forge export @fractary/faber-plugin --format langchain --output ./langchain/

# Export to Claude Code format
forge export @fractary/faber-plugin --format claude --output .claude/

# Export to n8n format
forge export @fractary/faber-plugin --format n8n --output ./n8n/

# Export only specific components
forge export @fractary/faber-plugin --format claude \
  --agents faber-manager --output .claude/
```

**SDK Usage**:
```typescript
import { Exporters } from '@fractary/forge';

const exporter = Exporters.getExporter(options.format);
const result = await exporter.export({
  plugin: args.plugin,
  outputPath: options.output || process.cwd(),
  components: {
    agents: options.agents?.split(','),
    tools: options.tools?.split(',')
  }
});
```

**Output**:
```
Exporting @fractary/faber-plugin to LangChain format...

✓ Loaded plugin manifest
✓ Resolved 2 agents, 5 tools

Converting to LangChain:
  Agents:
    ✓ faber-manager → langchain/agents/faber_manager.py
    ✓ faber-planner → langchain/agents/faber_planner.py
  Tools:
    ✓ frame → langchain/tools/frame.py
    ✓ architect → langchain/tools/architect.py
    ✓ build → langchain/tools/build.py
    ✓ evaluate → langchain/tools/evaluate.py
    ✓ release → langchain/tools/release.py

Export complete!
  Output: ./langchain/
  Files: 7 Python files

Next steps:
  cd langchain/
  pip install langchain langgraph
  python -m agents.faber_manager
```

---

## Implementation Checklist

### Phase 1: Registry Management (Week 1)

- [ ] `forge registry add <name> <url>`
- [ ] `forge registry list`
- [ ] `forge registry remove <name>`
- [ ] `forge registry sync`
- [ ] Configuration file management (~/.fractary/forge-config.json)
- [ ] Input validation and error handling
- [ ] Unit tests for registry commands

### Phase 2: Installation (Week 2)

- [ ] `forge install <plugin>`
- [ ] `forge uninstall <plugin>`
- [ ] Progress indicators for downloads
- [ ] Checksum verification integration
- [ ] Dependency resolution
- [ ] Unit tests for install commands

### Phase 3: Discovery (Week 3)

- [ ] `forge list [type]`
- [ ] `forge search <query>`
- [ ] `forge info <plugin>`
- [ ] Table formatting for output
- [ ] JSON output mode
- [ ] Unit tests for discovery commands

### Phase 4: Export (Week 4)

- [ ] `forge export <plugin> --format <format>`
- [ ] Integration with Exporters module
- [ ] Format validation
- [ ] Output directory management
- [ ] Unit tests for export commands

### Phase 5: Integration & Polish (Week 5)

- [ ] End-to-end integration tests
- [ ] Error message improvements
- [ ] Documentation (README, --help text)
- [ ] Examples and tutorials
- [ ] Performance optimization

---

## Dependencies

### NPM Packages Required

```json
{
  "dependencies": {
    "@fractary/forge": "^1.1.2",
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "ora": "^7.0.0",
    "cli-table3": "^0.6.3",
    "inquirer": "^9.2.0"
  }
}
```

### Forge SDK Modules Used

```typescript
import {
  Registry,     // Main registry module
  Exporters,    // Export functionality
  ForgeError,   // Error handling
  Logger        // Logging
} from '@fractary/forge';

// Registry submodules
const {
  Installer,
  ManifestResolver,
  ConfigManager,
  Cache
} = Registry;

// Exporters
const {
  LangChainExporter,
  ClaudeExporter,
  N8nExporter
} = Exporters;
```

---

## File Structure in fractary/cli

```
fractary/cli/
├── src/
│   ├── commands/
│   │   ├── registry/
│   │   │   ├── add.ts
│   │   │   ├── list.ts
│   │   │   ├── remove.ts
│   │   │   └── sync.ts
│   │   ├── install/
│   │   │   ├── install.ts
│   │   │   └── uninstall.ts
│   │   ├── discovery/
│   │   │   ├── list.ts
│   │   │   ├── search.ts
│   │   │   └── info.ts
│   │   └── export/
│   │       └── export.ts
│   ├── utils/
│   │   ├── table-formatter.ts
│   │   ├── progress.ts
│   │   └── error-handler.ts
│   └── index.ts
├── tests/
│   ├── commands/
│   └── integration/
└── package.json
```

---

## Error Handling

### Error Types to Handle

1. **Network Errors**: Registry unavailable, download failures
2. **Validation Errors**: Invalid manifest, checksum mismatch
3. **Configuration Errors**: Malformed config file
4. **Permission Errors**: Cannot write to directory
5. **Version Errors**: Version not found, version conflict

### Error Display Format

```
✗ Error: Failed to install @fractary/faber-plugin

Reason: Network timeout when fetching manifest

Troubleshooting:
  1. Check your internet connection
  2. Verify registry URL: forge registry list
  3. Try again: forge install @fractary/faber-plugin --force

For more help: https://docs.fractary.com/troubleshooting
```

---

## Testing Strategy

### Unit Tests

- Test each command in isolation
- Mock @fractary/forge SDK calls
- Verify argument parsing
- Test error scenarios

### Integration Tests

- Test full workflows (add registry → install plugin → list)
- Use test fixtures for manifests
- Verify file system state
- Test with real @fractary/forge SDK

### E2E Tests

- Test against real fractary/plugins registry
- Verify actual downloads and installations
- Test export functionality end-to-end

---

## Configuration File

Location: `~/.fractary/forge-config.json`

**Managed by**: `@fractary/forge` ConfigManager
**CLI responsibilities**:
- Initialize on first run
- Pass to SDK
- Display in `forge registry list`

**Example**:
```json
{
  "version": "1.0.0",
  "registries": [
    {
      "name": "fractary-official",
      "url": "https://github.com/fractary/plugins/raw/main/registry.json",
      "enabled": true,
      "priority": 50,
      "cache_ttl": 3600
    }
  ],
  "install": {
    "default_location": "global",
    "verify_checksums": true,
    "auto_resolve_dependencies": true
  }
}
```

---

## Progress Indicators

Use `ora` for spinners and progress:

```typescript
import ora from 'ora';

const spinner = ora('Installing @fractary/faber-plugin').start();

try {
  await installer.install(...);
  spinner.succeed('Installation complete!');
} catch (error) {
  spinner.fail('Installation failed');
  throw error;
}
```

---

## Output Formatting

### Table Formatting

Use `cli-table3` for tables:

```typescript
import Table from 'cli-table3';

const table = new Table({
  head: ['Plugin', 'Version', 'Agents', 'Tools'],
  colWidths: [30, 10, 8, 8]
});

table.push(
  ['@fractary/faber-plugin', '2.0.0', '2', '5'],
  ['@fractary/repo-plugin', '2.0.0', '1', '15']
);

console.log(table.toString());
```

### Colored Output

Use `chalk` for colors:

```typescript
import chalk from 'chalk';

console.log(chalk.green('✓'), 'Installation complete!');
console.log(chalk.red('✗'), 'Error occurred');
console.log(chalk.yellow('⚠'), 'Warning: Using cached data');
```

---

## Success Criteria

### Functional

- [ ] All 15 commands implemented and working
- [ ] Can install from fractary/plugins registry
- [ ] Export works for all formats
- [ ] Error messages are clear and helpful

### Non-Functional

- [ ] Commands respond in <2 seconds
- [ ] Progress indicators for long operations
- [ ] Help text is comprehensive
- [ ] Compatible with CI/CD environments

### Testing

- [ ] >80% unit test coverage
- [ ] Integration tests pass
- [ ] E2E test with real registry passes

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Registry Management | add, list, remove, sync commands |
| 2 | Installation | install, uninstall commands |
| 3 | Discovery | list, search, info commands |
| 4 | Export | export command |
| 5 | Polish | Tests, docs, error handling |

**Total**: 5 weeks to complete all commands

---

## Related Documents

- [SPEC-FORGE-005](./SPEC-FORGE-005-REGISTRY-MANIFEST-SYSTEM.md): Registry Manifest System (SDK spec)
- [SPEC-FORGE-008](./SPEC-FORGE-008-DIRECTORY-PER-DEFINITION.md): Directory-Per-Definition Structure
- [IMPL-20251216-PLUGINS-INTEGRATION](./IMPL-20251216-PLUGINS-INTEGRATION.md): Integration Roadmap

---

## Notes for CLI Developers

### Key Points

1. **CLI is a thin wrapper**: All business logic is in @fractary/forge SDK
2. **Focus on UX**: Your job is clear output, error messages, and progress indicators
3. **Delegate to SDK**: Call SDK functions, display results, handle errors
4. **Test with real registry**: Use fractary/plugins for integration testing

### SDK Is Ready

The registry functionality is **already implemented** in @fractary/forge@1.1.2:
- ✅ Registry resolvers (local, global, manifest, remote)
- ✅ Installer with dependency resolution
- ✅ Cache manager with TTL
- ✅ Config manager
- ✅ Exporters (LangChain, Claude, n8n)
- ✅ Comprehensive tests

**Your job**: Wire these SDK functions to CLI commands with great UX.

### Example Implementation

```typescript
// src/commands/install/install.ts
import { Command } from 'commander';
import { Registry } from '@fractary/forge';
import ora from 'ora';
import chalk from 'chalk';

export const installCommand = new Command('install')
  .description('Install a plugin from a registry')
  .argument('<plugin>', 'Plugin identifier')
  .option('--global', 'Install to global registry')
  .option('--dry-run', 'Show what would be installed')
  .action(async (plugin, options) => {
    const spinner = ora(`Installing ${plugin}`).start();

    try {
      const installer = new Registry.Installer();
      const result = await installer.install({
        package: plugin,
        location: options.global ? 'global' : 'local',
        dryRun: options.dryRun
      });

      spinner.succeed('Installation complete!');

      console.log(chalk.green('\nInstalled:'));
      console.log(`  Agents: ${result.agents.length}`);
      console.log(`  Tools: ${result.tools.length}`);
      console.log(`  Location: ${result.path}`);

    } catch (error) {
      spinner.fail('Installation failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });
```

---

**Document Version**: 1.0.0
**Status**: Ready for Implementation
**Last Updated**: 2025-12-16
