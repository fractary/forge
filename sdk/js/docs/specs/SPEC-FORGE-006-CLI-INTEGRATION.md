# SPEC-FORGE-006: CLI Integration Guide

**Version:** 1.0.0
**Status:** Draft
**Created:** 2025-12-15
**Updated:** 2025-12-15
**Author:** Fractary Team
**Related Work:** WORK-00006 (Phase 3B), SPEC-FORGE-005 (Registry Manifest System)

## 1. Overview

This specification defines how the `fractary/cli` project should integrate with the `@fractary/forge` Registry SDK to provide a unified `fractary` CLI with `forge` as a subcommand.

### 1.1 Purpose

- Establish clear integration patterns between fractary/cli and @fractary/forge
- Define command structure and CLI UX for `fractary forge` commands
- Specify error handling and user feedback guidelines
- Provide reference implementations for all registry operations

### 1.2 Scope

**In Scope:**
- Command structure and argument parsing
- SDK method mapping for each command
- Error handling and user feedback patterns
- Configuration management through SDK
- Exit codes and success/failure reporting
- Progress indicators and verbose output

**Out of Scope:**
- Forge SDK implementation details (see SPEC-FORGE-005)
- FABER-specific commands (separate spec)
- Web UI/dashboard integration
- Plugin development tooling

### 1.3 Architecture Overview

```
┌────────────────────────────────────────────────────┐
│  fractary/cli (CLI Application)                    │
│  - Parses commands and flags                       │
│  - Formats output for terminal                     │
│  - Handles user interaction                        │
└────────────────────────────────────────────────────┘
                       ↓ (imports)
┌────────────────────────────────────────────────────┐
│  @fractary/forge (Registry SDK)                    │
│  - Plugin resolution and installation              │
│  - Manifest fetching and caching                   │
│  - Configuration management                        │
│  - Component type handling                         │
└────────────────────────────────────────────────────┘
                       ↓ (operations)
┌────────────────────────────────────────────────────┐
│  File System                                        │
│  - .fractary/ (local installations)                │
│  - ~/.fractary/registry/ (global installations)    │
│  - ~/.fractary/config.json (global config)         │
└────────────────────────────────────────────────────┘
```

## 2. Command Structure

All Forge registry commands are accessed via the `fractary forge` namespace:

```bash
fractary forge <subcommand> [arguments] [flags]
```

### 2.1 Available Subcommands

| Subcommand | Purpose | SDK Component |
|------------|---------|---------------|
| `install <plugin>` | Install a plugin | `Registry.installer` |
| `uninstall <plugin>` | Remove a plugin | `Registry.installer` |
| `list` | List installed plugins | `Registry.resolver` |
| `search <query>` | Search available plugins | `Registry.resolver` |
| `registry add <name> <url>` | Add registry | `Registry.configManager` |
| `registry remove <name>` | Remove registry | `Registry.configManager` |
| `registry list` | List registries | `Registry.configManager` |
| `cache clear` | Clear manifest cache | `Registry.manifestCache` |
| `cache stats` | Show cache statistics | `Registry.manifestCache` |

## 3. Command Implementations

### 3.1 Install Command

**Command:**
```bash
fractary forge install <plugin> [flags]
```

**Flags:**
- `--global, -g`: Install globally (default: local)
- `--force, -f`: Force reinstall if already installed
- `--agents-only`: Install only agents from plugin
- `--tools-only`: Install only tools from plugin
- `--workflows-only`: Install only workflows from plugin
- `--no-hooks`: Skip installing hooks
- `--no-commands`: Skip installing commands
- `--dry-run`: Show what would be installed without installing
- `--verbose, -v`: Show detailed progress

**SDK Integration:**
```typescript
// fractary/cli/src/commands/forge/install.ts
import { Registry, InstallOptions, InstallResult } from '@fractary/forge';

export async function installCommand(
  pluginName: string,
  flags: any
): Promise<void> {
  try {
    // Build install options from flags
    const options: InstallOptions = {
      scope: flags.global ? 'global' : 'local',
      force: flags.force || false,
      agentsOnly: flags.agentsOnly || false,
      toolsOnly: flags.toolsOnly || false,
      workflowsOnly: flags.workflowsOnly || false,
      noHooks: flags.noHooks || false,
      noCommands: flags.noCommands || false,
      dryRun: flags.dryRun || false,
    };

    // Show progress indicator
    const spinner = startSpinner(`Installing ${pluginName}...`);

    // Call SDK installer
    const result: InstallResult = await Registry.installer.installPlugin(
      pluginName,
      options
    );

    spinner.success();

    // Format and display results
    if (options.dryRun) {
      console.log(`\nWould install ${result.plugin.name}@${result.plugin.version}:`);
    } else {
      console.log(`\n✓ Installed ${result.plugin.name}@${result.plugin.version}`);
    }

    // Show installation summary
    if (result.installed.agents > 0) {
      console.log(`  • ${result.installed.agents} agent(s)`);
    }
    if (result.installed.tools > 0) {
      console.log(`  • ${result.installed.tools} tool(s)`);
    }
    if (result.installed.workflows > 0) {
      console.log(`  • ${result.installed.workflows} workflow(s)`);
    }
    if (result.installed.templates > 0) {
      console.log(`  • ${result.installed.templates} template(s)`);
    }
    if (result.installed.hooks > 0) {
      console.log(`  • ${result.installed.hooks} hook(s)`);
    }
    if (result.installed.commands > 0) {
      console.log(`  • ${result.installed.commands} command(s)`);
    }

    // Show installation location
    const scope = options.scope === 'global' ? 'globally' : 'locally';
    console.log(`\nInstalled ${scope} to: ${result.installPath}`);

    // Verbose output
    if (flags.verbose) {
      console.log('\nInstalled components:');
      for (const item of result.items) {
        console.log(`  ${item.type}: ${item.name} (${item.path})`);
      }
    }

    process.exit(0);
  } catch (error) {
    handleError(error, 'Installation failed');
  }
}
```

**Error Handling:**
```typescript
function handleError(error: unknown, context: string): never {
  if (error instanceof Error) {
    console.error(`\n✗ ${context}: ${error.message}`);

    // Show helpful hints based on error type
    if (error.message.includes('not found')) {
      console.error('\nTry:');
      console.error('  • Check plugin name spelling');
      console.error('  • Run: fractary forge search <keyword>');
      console.error('  • Verify registry is configured: fractary forge registry list');
    } else if (error.message.includes('checksum')) {
      console.error('\nChecksum verification failed. This may indicate:');
      console.error('  • Corrupted download');
      console.error('  • Network issues');
      console.error('  • Try again or use --force flag');
    } else if (error.message.includes('permission')) {
      console.error('\nPermission denied. Try:');
      console.error('  • Run with sudo (for global install)');
      console.error('  • Check file permissions');
    }

    if (process.env.DEBUG) {
      console.error('\nStack trace:', error.stack);
    }
  } else {
    console.error(`\n✗ ${context}: Unknown error`);
  }

  process.exit(1);
}
```

### 3.2 List Command

**Command:**
```bash
fractary forge list [flags]
```

**Flags:**
- `--global, -g`: List global installations
- `--local, -l`: List local installations (default: both)
- `--type <type>`: Filter by component type (agent, tool, workflow, etc.)
- `--json`: Output as JSON

**SDK Integration:**
```typescript
// fractary/cli/src/commands/forge/list.ts
import { Registry } from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

export async function listCommand(flags: any): Promise<void> {
  try {
    const results = {
      local: [] as any[],
      global: [] as any[],
    };

    // Determine scope
    const showLocal = !flags.global;
    const showGlobal = !flags.local || flags.global;

    // List local installations
    if (showLocal) {
      const localPath = path.join(process.cwd(), '.fractary');
      results.local = await listInstallations(localPath, flags.type);
    }

    // List global installations
    if (showGlobal) {
      const globalPath = path.join(os.homedir(), '.fractary', 'registry');
      results.global = await listInstallations(globalPath, flags.type);
    }

    // Output format
    if (flags.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      formatListOutput(results, showLocal, showGlobal);
    }

    process.exit(0);
  } catch (error) {
    handleError(error, 'Failed to list plugins');
  }
}

async function listInstallations(
  basePath: string,
  typeFilter?: string
): Promise<any[]> {
  const installations = [];
  const componentTypes = typeFilter
    ? [typeFilter]
    : ['agents', 'tools', 'workflows', 'templates'];

  for (const type of componentTypes) {
    const typePath = path.join(basePath, type);

    if (await fs.pathExists(typePath)) {
      const items = await fs.readdir(typePath);

      for (const item of items) {
        const itemPath = path.join(typePath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          // Plugin directory
          const manifestPath = path.join(itemPath, 'plugin.json');
          if (await fs.pathExists(manifestPath)) {
            const manifest = await fs.readJson(manifestPath);
            installations.push({
              name: manifest.name,
              version: manifest.version,
              type: 'plugin',
              path: itemPath,
            });
          }
        } else if (item.endsWith('.yaml')) {
          // Standalone component
          const component = await loadYaml(itemPath);
          installations.push({
            name: component.name,
            version: component.version,
            type: type.slice(0, -1), // Remove plural 's'
            path: itemPath,
          });
        }
      }
    }
  }

  return installations;
}

function formatListOutput(
  results: any,
  showLocal: boolean,
  showGlobal: boolean
): void {
  if (showLocal && results.local.length > 0) {
    console.log('\nLocal installations (.fractary/):');
    for (const item of results.local) {
      console.log(`  ${item.name}@${item.version} (${item.type})`);
    }
  } else if (showLocal) {
    console.log('\nNo local installations found.');
  }

  if (showGlobal && results.global.length > 0) {
    console.log('\nGlobal installations (~/.fractary/registry/):');
    for (const item of results.global) {
      console.log(`  ${item.name}@${item.version} (${item.type})`);
    }
  } else if (showGlobal) {
    console.log('\nNo global installations found.');
  }

  const total = results.local.length + results.global.length;
  console.log(`\nTotal: ${total} installation(s)`);
}
```

### 3.3 Registry Add Command

**Command:**
```bash
fractary forge registry add <name> <url> [flags]
```

**Flags:**
- `--priority <n>`: Set registry priority (lower = higher priority, default: 10)
- `--disabled`: Add registry in disabled state
- `--global, -g`: Add to global config (default: project config)

**SDK Integration:**
```typescript
// fractary/cli/src/commands/forge/registry-add.ts
import { Registry, RegistryConfig } from '@fractary/forge';

export async function registryAddCommand(
  name: string,
  url: string,
  flags: any
): Promise<void> {
  try {
    // Validate URL
    if (!isValidUrl(url)) {
      console.error(`✗ Invalid URL: ${url}`);
      process.exit(1);
    }

    // Build registry config
    const registryConfig: Omit<RegistryConfig, 'cache_ttl'> = {
      name,
      type: 'manifest',
      url,
      enabled: !flags.disabled,
      priority: flags.priority || 10,
    };

    // Add to appropriate config
    if (flags.global) {
      await Registry.configManager.addRegistry(registryConfig, 'global');
      console.log(`✓ Added registry '${name}' to global configuration`);
    } else {
      await Registry.configManager.addRegistry(registryConfig, 'project');
      console.log(`✓ Added registry '${name}' to project configuration`);
    }

    // Show registry details
    console.log(`\nRegistry details:`);
    console.log(`  Name: ${name}`);
    console.log(`  URL: ${url}`);
    console.log(`  Priority: ${registryConfig.priority}`);
    console.log(`  Enabled: ${registryConfig.enabled}`);

    // Test fetch
    console.log(`\nTesting registry connection...`);
    try {
      const result = await Registry.manifestResolver.fetchManifest({
        name,
        type: 'manifest',
        url,
        enabled: true,
        priority: registryConfig.priority,
      });

      console.log(`✓ Successfully fetched manifest`);
      console.log(`  Plugins available: ${result.manifest.plugins.length}`);
    } catch (error) {
      console.warn(`⚠ Warning: Could not fetch manifest from registry`);
      console.warn(`  ${(error as Error).message}`);
      console.warn(`  Registry added but may not be accessible`);
    }

    process.exit(0);
  } catch (error) {
    handleError(error, 'Failed to add registry');
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

### 3.4 Cache Commands

**Commands:**
```bash
fractary forge cache clear [pattern]
fractary forge cache stats
```

**SDK Integration:**
```typescript
// fractary/cli/src/commands/forge/cache.ts
import { Registry } from '@fractary/forge';

export async function cacheClearCommand(pattern?: string): Promise<void> {
  try {
    if (pattern) {
      // Clear specific entries
      await Registry.manifestCache.clear(pattern);
      console.log(`✓ Cleared cache entries matching: ${pattern}`);
    } else {
      // Clear all
      await Registry.manifestCache.clear();
      console.log(`✓ Cleared all cache entries`);
    }

    process.exit(0);
  } catch (error) {
    handleError(error, 'Failed to clear cache');
  }
}

export async function cacheStatsCommand(): Promise<void> {
  try {
    const stats = await Registry.manifestCache.getStats();

    console.log('\nCache Statistics:');
    console.log(`  Total entries: ${stats.totalEntries}`);
    console.log(`  Fresh entries: ${stats.freshEntries}`);
    console.log(`  Stale entries: ${stats.staleEntries}`);
    console.log(`  Total size: ${formatBytes(stats.totalSize)}`);

    if (stats.oldestEntry) {
      console.log(`  Oldest entry: ${formatDate(stats.oldestEntry)}`);
    }
    if (stats.newestEntry) {
      console.log(`  Newest entry: ${formatDate(stats.newestEntry)}`);
    }

    // Show details per registry
    if (stats.byRegistry && Object.keys(stats.byRegistry).length > 0) {
      console.log('\nBy Registry:');
      for (const [registry, count] of Object.entries(stats.byRegistry)) {
        console.log(`  ${registry}: ${count} entries`);
      }
    }

    process.exit(0);
  } catch (error) {
    handleError(error, 'Failed to get cache stats');
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
```

## 4. User Feedback Patterns

### 4.1 Progress Indicators

Use spinners for long-running operations:

```typescript
import ora from 'ora';

function startSpinner(message: string) {
  return ora(message).start();
}

// Usage
const spinner = startSpinner('Installing plugin...');
try {
  await operation();
  spinner.succeed('Installation complete');
} catch (error) {
  spinner.fail('Installation failed');
  throw error;
}
```

### 4.2 Success Messages

Format: `✓ <action> <subject>@<version>`

```
✓ Installed @fractary/faber-plugin@1.0.0
  • 3 agents
  • 5 tools
  • 2 workflows

Installed globally to: ~/.fractary/registry/@fractary/faber-plugin
```

### 4.3 Error Messages

Format: `✗ <context>: <error message>`

```
✗ Installation failed: Plugin not found in any registry

Try:
  • Check plugin name spelling
  • Run: fractary forge search <keyword>
  • Verify registry is configured: fractary forge registry list
```

### 4.4 Warnings

Format: `⚠ <warning message>`

```
⚠ Warning: Plugin already installed locally
  Use --force to reinstall
  Use --global to install globally instead
```

## 5. Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Not found (plugin, registry, component) |
| 4 | Permission denied |
| 5 | Network error |
| 6 | Checksum verification failed |
| 7 | Configuration error |

## 6. Configuration Management

### 6.1 Configuration Files

- **Project config:** `.fractary/config.json`
- **Global config:** `~/.fractary/config.json`

### 6.2 Config Priority

1. Project config (highest)
2. Global config
3. SDK defaults (lowest)

The SDK handles merging automatically via `Registry.configManager.loadConfig()`.

### 6.3 Example: Accessing Config

```typescript
import { Registry } from '@fractary/forge';

// Load merged configuration
const config = await Registry.configManager.loadConfig();

// Access registries
for (const registry of config.registries) {
  if (registry.enabled) {
    console.log(`${registry.name}: ${registry.url}`);
  }
}
```

## 7. Testing Guidelines

### 7.1 Unit Tests

Test CLI command handlers separately from SDK:

```typescript
// __tests__/commands/forge/install.test.ts
import { installCommand } from '../../../src/commands/forge/install';
import { Registry } from '@fractary/forge';

jest.mock('@fractary/forge');

describe('installCommand', () => {
  it('should call SDK installer with correct options', async () => {
    const mockInstall = jest.fn().mockResolvedValue({
      plugin: { name: '@test/plugin', version: '1.0.0' },
      installed: { agents: 1, tools: 2 },
      installPath: '/test/path',
      items: [],
    });

    (Registry.installer.installPlugin as jest.Mock) = mockInstall;

    await installCommand('@test/plugin', { global: true, force: false });

    expect(mockInstall).toHaveBeenCalledWith('@test/plugin', {
      scope: 'global',
      force: false,
      agentsOnly: false,
      toolsOnly: false,
      workflowsOnly: false,
      noHooks: false,
      noCommands: false,
      dryRun: false,
    });
  });
});
```

### 7.2 Integration Tests

Test with real SDK and mock file system:

```typescript
import { Registry } from '@fractary/forge';
import { vol } from 'memfs';

jest.mock('fs-extra', () => require('memfs'));

describe('install integration', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should install plugin to correct location', async () => {
    // Setup mock file system
    vol.fromJSON({
      '/home/user/.fractary/registry/': null,
    });

    // Run install
    const result = await Registry.installer.installPlugin('@test/plugin', {
      scope: 'global',
    });

    // Verify installation
    expect(result.installPath).toBe('/home/user/.fractary/registry/@test/plugin');
    expect(vol.existsSync(result.installPath)).toBe(true);
  });
});
```

### 7.3 E2E Tests

Test complete CLI flow with subprocess:

```typescript
import { execSync } from 'child_process';

describe('forge CLI e2e', () => {
  it('should install plugin globally', () => {
    const output = execSync('fractary forge install @test/plugin --global', {
      encoding: 'utf-8',
    });

    expect(output).toContain('✓ Installed @test/plugin');
    expect(output).toContain('Installed globally');
  });
});
```

## 8. Implementation Checklist

### 8.1 Phase 1: Core Commands
- [ ] Implement `forge install` command
- [ ] Implement `forge list` command
- [ ] Implement error handling utilities
- [ ] Add progress indicators
- [ ] Write unit tests

### 8.2 Phase 2: Registry Management
- [ ] Implement `forge registry add` command
- [ ] Implement `forge registry remove` command
- [ ] Implement `forge registry list` command
- [ ] Test multi-registry configuration
- [ ] Write integration tests

### 8.3 Phase 3: Cache & Utilities
- [ ] Implement `forge cache clear` command
- [ ] Implement `forge cache stats` command
- [ ] Implement `forge search` command (future)
- [ ] Implement `forge uninstall` command
- [ ] Write e2e tests

### 8.4 Phase 4: Polish
- [ ] Add shell completion support
- [ ] Improve error messages
- [ ] Add `--help` documentation
- [ ] Create user guide
- [ ] Performance optimization

## 9. Example: Complete Install Flow

```typescript
// fractary/cli/src/commands/forge/install.ts
import { Command } from 'commander';
import { Registry, InstallOptions, InstallResult } from '@fractary/forge';
import ora from 'ora';

export function createInstallCommand(): Command {
  return new Command('install')
    .description('Install a plugin from registry')
    .argument('<plugin>', 'Plugin name (e.g., @fractary/faber-plugin)')
    .option('-g, --global', 'Install globally')
    .option('-f, --force', 'Force reinstall')
    .option('--agents-only', 'Install only agents')
    .option('--tools-only', 'Install only tools')
    .option('--workflows-only', 'Install only workflows')
    .option('--no-hooks', 'Skip hooks')
    .option('--no-commands', 'Skip commands')
    .option('--dry-run', 'Show what would be installed')
    .option('-v, --verbose', 'Show detailed progress')
    .action(async (plugin: string, options: any) => {
      try {
        await installCommand(plugin, options);
      } catch (error) {
        handleError(error, 'Installation failed');
      }
    });
}

async function installCommand(
  pluginName: string,
  flags: any
): Promise<void> {
  const options: InstallOptions = {
    scope: flags.global ? 'global' : 'local',
    force: flags.force || false,
    agentsOnly: flags.agentsOnly || false,
    toolsOnly: flags.toolsOnly || false,
    workflowsOnly: flags.workflowsOnly || false,
    noHooks: !flags.hooks,
    noCommands: !flags.commands,
    dryRun: flags.dryRun || false,
  };

  const spinner = ora(`Installing ${pluginName}...`).start();

  try {
    const result: InstallResult = await Registry.installer.installPlugin(
      pluginName,
      options
    );

    spinner.succeed();

    if (options.dryRun) {
      console.log(`\nWould install ${result.plugin.name}@${result.plugin.version}:`);
    } else {
      console.log(`\n✓ Installed ${result.plugin.name}@${result.plugin.version}`);
    }

    showInstallationSummary(result, options);

    if (flags.verbose) {
      showDetailedOutput(result);
    }

    process.exit(0);
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

function showInstallationSummary(
  result: InstallResult,
  options: InstallOptions
): void {
  const counts = result.installed;
  const items = [];

  if (counts.agents > 0) items.push(`${counts.agents} agent(s)`);
  if (counts.tools > 0) items.push(`${counts.tools} tool(s)`);
  if (counts.workflows > 0) items.push(`${counts.workflows} workflow(s)`);
  if (counts.templates > 0) items.push(`${counts.templates} template(s)`);
  if (counts.hooks > 0) items.push(`${counts.hooks} hook(s)`);
  if (counts.commands > 0) items.push(`${counts.commands} command(s)`);

  if (items.length > 0) {
    items.forEach(item => console.log(`  • ${item}`));
  }

  const scope = options.scope === 'global' ? 'globally' : 'locally';
  console.log(`\nInstalled ${scope} to: ${result.installPath}`);
}

function showDetailedOutput(result: InstallResult): void {
  console.log('\nInstalled components:');
  for (const item of result.items) {
    console.log(`  ${item.type}: ${item.name}`);
    console.log(`    Path: ${item.path}`);
    if (item.checksum) {
      console.log(`    Checksum: ${item.checksum.slice(0, 16)}...`);
    }
  }
}

function handleError(error: unknown, context: string): never {
  if (error instanceof Error) {
    console.error(`\n✗ ${context}: ${error.message}`);

    // Contextual help
    if (error.message.includes('not found')) {
      console.error('\nTry:');
      console.error('  • Check plugin name spelling');
      console.error('  • Run: fractary forge search <keyword>');
      console.error('  • Verify registry: fractary forge registry list');
    }

    if (process.env.DEBUG) {
      console.error('\nStack:', error.stack);
    }
  } else {
    console.error(`\n✗ ${context}: Unknown error`);
  }

  process.exit(1);
}
```

## 10. Future Enhancements

### 10.1 Search Command
- Full-text search across registries
- Filter by component type, tags, author
- Ranking by downloads, ratings

### 10.2 Update Command
- Check for plugin updates
- Interactive update selection
- Bulk update operations

### 10.3 Interactive Mode
- `fractary forge` without arguments opens interactive menu
- Browse plugins, view details, install/uninstall
- Configuration wizard

### 10.4 Plugin Development Tools
- `fractary forge init` - Scaffold new plugin
- `fractary forge validate` - Validate plugin structure
- `fractary forge publish` - Publish to registry (future Stockyard)

## 11. References

- **SPEC-FORGE-005**: Registry Manifest System
- **[Registry SDK Documentation](../../src/registry/README.md)**: Complete SDK reference
- **[Commander.js](https://github.com/tj/commander.js)**: Recommended CLI framework
- **[Ora](https://github.com/sindresorhus/ora)**: Progress spinners
- **[Chalk](https://github.com/chalk/chalk)**: Terminal colors
