#!/usr/bin/env node
# SPEC-FORGE-004: CLI Integration - Forge Commands for fractary/cli

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Created** | 2025-12-14 |
| **Updated** | 2025-12-14 |
| **Author** | Implementation Team |
| **Project** | `fractary/cli` |
| **SDK Dependency** | `@fractary/forge` |
| **Related** | SPEC-FORGE-002-IMPLEMENTATION |
| **Phase** | CLI Command Implementation |

---

## 1. Executive Summary

This specification details the implementation of **Forge CLI commands** in the `fractary/cli` project, providing user-friendly command-line interfaces for all `@fractary/forge` SDK functionality including lockfile management, package updates, forking, and registry operations.

### 1.1 Context

The `@fractary/forge` SDK (v1.0.0+) provides complete registry and resolution functionality:

- ✅ Lockfile system with integrity hashing
- ✅ Manifest management and package metadata
- ✅ Dependency resolution with cycle detection
- ✅ Fork management with three-way merge
- ✅ Update detection and application
- ✅ Stockyard integration (stub → full implementation in SPEC-FORGE-003)

These capabilities need CLI commands in the `fractary/cli` project under the `forge` namespace.

### 1.2 Command Structure

All Forge commands will be under the `forge` namespace:

```bash
fractary forge <command> [options]
```

Available commands:
- `forge init` - Initialize Forge in a project
- `forge install <name>` - Install agent/tool
- `forge update [name]` - Update packages
- `forge lock` - Generate/validate lockfile
- `forge list` - List installed packages
- `forge info <name>` - Show package details
- `forge fork <source> <target>` - Fork agent/tool
- `forge merge <name>` - Merge upstream changes
- `forge search <query>` - Search Stockyard
- `forge login` - Authenticate with Stockyard
- `forge logout` - Clear authentication
- `forge whoami` - Show authentication status

---

## 2. Command Specifications

### 2.1 `forge init`

**Purpose**: Initialize Forge configuration in a project

**Usage**:
```bash
fractary forge init [options]

Options:
  --stockyard <url>    Stockyard URL (default: https://stockyard.fractary.dev)
  --global-path <path> Global registry path (default: ~/.fractary/registry)
  --yes, -y            Skip prompts, use defaults
```

**Behavior**:
1. Check if `.fractary/plugins/forge/` already exists
2. Prompt for configuration (or use defaults with `--yes`)
3. Create directory structure:
   ```
   .fractary/
   ├── agents/           # Local agents
   ├── tools/            # Local tools
   └── plugins/
       └── forge/
           ├── config.json      # Forge configuration
           └── lockfile.json    # Generated later
   ```
4. Write `config.json` with user preferences
5. Display next steps (install packages, generate lockfile)

**Implementation**:
```typescript
// cli/src/commands/forge/init.ts

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as inquirer from 'inquirer';
import { logger } from '../../utils/logger';

interface InitOptions {
  stockyard?: string;
  globalPath?: string;
  yes?: boolean;
}

export const initCommand = new Command('init')
  .description('Initialize Forge in this project')
  .option('--stockyard <url>', 'Stockyard URL', 'https://stockyard.fractary.dev')
  .option('--global-path <path>', 'Global registry path')
  .option('-y, --yes', 'Skip prompts, use defaults')
  .action(async (options: InitOptions) => {
    const cwd = process.cwd();
    const forgeDir = path.join(cwd, '.fractary/plugins/forge');

    // Check if already initialized
    if (await fs.pathExists(forgeDir)) {
      logger.warn('Forge is already initialized in this project');
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Overwrite existing configuration?',
          default: false,
        },
      ]);

      if (!overwrite) {
        logger.info('Initialization cancelled');
        return;
      }
    }

    // Gather configuration
    const config = options.yes
      ? {
          stockyard: { url: options.stockyard },
          globalPath: options.globalPath || path.join(process.env.HOME || '~', '.fractary/registry'),
        }
      : await promptForConfig(options);

    // Create directory structure
    await fs.ensureDir(path.join(cwd, '.fractary/agents'));
    await fs.ensureDir(path.join(cwd, '.fractary/tools'));
    await fs.ensureDir(forgeDir);

    // Write config
    await fs.writeFile(
      path.join(forgeDir, 'config.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    logger.success('Forge initialized successfully!');
    logger.info('\nNext steps:');
    logger.info('  1. Install agents: fractary forge install <agent-name>');
    logger.info('  2. Generate lockfile: fractary forge lock');
  });

async function promptForConfig(options: InitOptions) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'stockyardUrl',
      message: 'Stockyard URL:',
      default: options.stockyard || 'https://stockyard.fractary.dev',
    },
    {
      type: 'input',
      name: 'globalPath',
      message: 'Global registry path:',
      default: options.globalPath || path.join(process.env.HOME || '~', '.fractary/registry'),
    },
    {
      type: 'confirm',
      name: 'enableStockyard',
      message: 'Enable Stockyard integration?',
      default: true,
    },
  ]);

  return {
    stockyard: {
      url: answers.stockyardUrl,
      enabled: answers.enableStockyard,
    },
    globalPath: answers.globalPath,
  };
}
```

### 2.2 `forge install`

**Purpose**: Install an agent or tool

**Usage**:
```bash
fractary forge install <name> [options]

Arguments:
  name                 Agent or tool name (e.g., my-agent, my-agent@1.0.0)

Options:
  --type <type>        Force type: agent or tool (auto-detect if omitted)
  --save               Update lockfile after install (default: true)
  --global, -g         Install to global registry instead of local
```

**Behavior**:
1. Parse package name and version
2. Resolve using `DefinitionResolver`
3. Download to local or global registry
4. Update manifest
5. Update lockfile (if `--save`)
6. Display installation summary

**Implementation**:
```typescript
// cli/src/commands/forge/install.ts

import { Command } from 'commander';
import { DefinitionResolver } from '@fractary/forge';
import { logger } from '../../utils/logger';

interface InstallOptions {
  type?: 'agent' | 'tool';
  save?: boolean;
  global?: boolean;
}

export const installCommand = new Command('install')
  .description('Install an agent or tool')
  .argument('<name>', 'Package name (e.g., my-agent@1.0.0)')
  .option('--type <type>', 'Force type: agent or tool')
  .option('--save', 'Update lockfile after install', true)
  .option('-g, --global', 'Install to global registry')
  .action(async (name: string, options: InstallOptions) => {
    logger.info(`Installing ${name}...`);

    // Load Forge config
    const config = await loadForgeConfig();
    const resolver = new DefinitionResolver(config.registry);

    try {
      // Try to resolve as agent first, then tool
      let resolved;
      let type: 'agent' | 'tool';

      if (options.type === 'agent' || !options.type) {
        try {
          resolved = await resolver.resolveAgent(name);
          type = 'agent';
        } catch (error) {
          if (options.type === 'agent') throw error;
        }
      }

      if (!resolved && (options.type === 'tool' || !options.type)) {
        resolved = await resolver.resolveTool(name);
        type = 'tool';
      }

      if (!resolved) {
        throw new Error(`Package '${name}' not found`);
      }

      logger.success(`✓ Installed ${name}@${resolved.version}`);
      logger.info(`  Source: ${resolved.source}`);
      logger.info(`  Path: ${resolved.path}`);

      // Update lockfile if --save
      if (options.save) {
        const lockfileManager = new LockfileManager(resolver);
        await lockfileManager.generate({ force: true });
        logger.success('✓ Lockfile updated');
      }
    } catch (error) {
      logger.error(`Failed to install ${name}: ${error.message}`);
      process.exit(1);
    }
  });
```

### 2.3 `forge update`

**Purpose**: Update packages to latest versions

**Usage**:
```bash
fractary forge update [name] [options]

Arguments:
  name                 Optional package name (updates all if omitted)

Options:
  --strategy <type>    Update strategy: latest, patch, minor (default: latest)
  --check              Check for updates without applying
  --no-skip-breaking   Include breaking changes
  --dry-run            Preview changes without applying
```

**Behavior**:
1. Load lockfile and manifests
2. Check for updates using `UpdateChecker`
3. Display available updates with breaking change warnings
4. Apply updates using `UpdateManager` (unless `--check` or `--dry-run`)
5. Update lockfile and manifests
6. Display summary of updated packages

**Implementation**:
```typescript
// cli/src/commands/forge/update.ts

import { Command } from 'commander';
import {
  UpdateChecker,
  UpdateManager,
  LockfileManager,
  ManifestManager,
} from '@fractary/forge';
import { logger } from '../../utils/logger';

interface UpdateOptions {
  strategy?: 'latest' | 'patch' | 'minor';
  check?: boolean;
  skipBreaking?: boolean;
  dryRun?: boolean;
}

export const updateCommand = new Command('update')
  .description('Update packages to latest versions')
  .argument('[name]', 'Optional package name (updates all if omitted)')
  .option('--strategy <type>', 'Update strategy: latest, patch, minor', 'latest')
  .option('--check', 'Check for updates without applying')
  .option('--no-skip-breaking', 'Include breaking changes')
  .option('--dry-run', 'Preview changes without applying')
  .action(async (name: string | undefined, options: UpdateOptions) => {
    const config = await loadForgeConfig();
    const lockfileManager = new LockfileManager(/* ... */);
    const manifestManager = new ManifestManager(/* ... */);
    const updateChecker = new UpdateChecker(lockfileManager, manifestManager);
    const updateManager = new UpdateManager(/* ... */);

    try {
      // Check for updates
      const checkResult = await updateChecker.checkUpdates();

      if (!checkResult.hasUpdates) {
        logger.success('All packages are up to date');
        return;
      }

      // Display updates
      logger.info(updateChecker.formatUpdateSummary(checkResult));

      // Exit if --check
      if (options.check) {
        return;
      }

      // Apply updates
      const updateResult = await updateManager.update({
        strategy: options.strategy,
        skipBreaking: options.skipBreaking,
        dryRun: options.dryRun,
        packages: name ? [name] : undefined,
      });

      // Display results
      if (updateResult.updated.length > 0) {
        logger.success(`\nUpdated ${updateResult.updated.length} package(s):`);
        for (const pkg of updateResult.updated) {
          logger.info(`  ✓ ${pkg.name}: ${pkg.from} → ${pkg.to}`);
        }
      }

      if (updateResult.failed.length > 0) {
        logger.error(`\nFailed to update ${updateResult.failed.length} package(s):`);
        for (const pkg of updateResult.failed) {
          logger.error(`  ✗ ${pkg.name}: ${pkg.error}`);
        }
      }

      if (updateResult.skipped.length > 0) {
        logger.warn(`\nSkipped ${updateResult.skipped.length} package(s):`);
        for (const pkg of updateResult.skipped) {
          logger.warn(`  - ${pkg.name} (${pkg.reason})`);
        }
      }
    } catch (error) {
      logger.error(`Update failed: ${error.message}`);
      process.exit(1);
    }
  });
```

### 2.4 `forge lock`

**Purpose**: Generate or validate lockfile

**Usage**:
```bash
fractary forge lock [options]

Options:
  --validate           Validate existing lockfile
  --force              Regenerate even if lockfile exists
```

**Behavior**:
1. Discover used agents and tools
2. Resolve all dependencies
3. Calculate integrity hashes
4. Generate lockfile with pinned versions
5. Validate integrity (if `--validate`)

### 2.5 `forge list`

**Purpose**: List installed packages

**Usage**:
```bash
fractary forge list [options]

Options:
  --type <type>        Filter by type: agent or tool
  --source <source>    Filter by source: local, global, stockyard
  --updates            Show packages with available updates
  --json               Output as JSON
```

**Behavior**:
1. Load lockfile and manifests
2. List all installed packages with versions
3. Highlight packages with updates (if `--updates`)
4. Format output as table or JSON

**Output Example**:
```
Installed Packages (3)

NAME              TYPE    VERSION    SOURCE      UPDATES
my-agent          agent   1.0.0      local       -
another-agent     agent   2.1.0      global      2.2.0 available
my-tool           tool    1.5.0      stockyard   -
```

### 2.6 `forge info`

**Purpose**: Show detailed package information

**Usage**:
```bash
fractary forge info <name> [options]

Arguments:
  name                 Package name

Options:
  --versions           Show all available versions
  --json               Output as JSON
```

**Behavior**:
1. Load manifest for package
2. Display metadata:
   - Name, type, description
   - Current version, latest version
   - Source (local/global/stockyard)
   - Dependencies
   - Stockyard metadata (author, license, downloads, etc.)
   - Fork information (if applicable)

**Output Example**:
```
Package: my-agent
Type: agent
Version: 1.0.0 (latest: 1.1.0)
Source: global

Description:
  A sample agent for testing

Dependencies:
  - my-tool@^1.0.0
  - another-tool@^2.0.0

Stockyard:
  Author: fractary
  License: MIT
  Downloads: 1,234
  Rating: 4.5/5
  Tags: test, example
```

### 2.7 `forge fork`

**Purpose**: Fork an agent or tool to local registry

**Usage**:
```bash
fractary forge fork <source> <target> [options]

Arguments:
  source               Source package name
  target               Target package name

Options:
  --type <type>        Force type: agent or tool
  --customize          Open in editor for customization
```

**Behavior**:
1. Resolve source package
2. Create forked definition with metadata
3. Save to local registry (`.fractary/agents/` or `.fractary/tools/`)
4. Track fork in manifest
5. Optionally open in editor (if `--customize`)

### 2.8 `forge merge`

**Purpose**: Merge upstream changes into forked package

**Usage**:
```bash
fractary forge merge <name> [options]

Arguments:
  name                 Forked package name

Options:
  --check              Check for upstream updates without merging
  --strategy <type>    Conflict resolution: auto, local, upstream, manual
  --preview            Show merge preview without applying
```

**Behavior**:
1. Load forked package
2. Check for upstream updates
3. Perform three-way merge
4. Handle conflicts based on strategy
5. Save merged definition
6. Display merge summary

### 2.9 `forge search`

**Purpose**: Search Stockyard for packages

**Usage**:
```bash
fractary forge search <query> [options]

Arguments:
  query                Search query

Options:
  --type <type>        Filter by type: agent or tool
  --page <number>      Page number (default: 1)
  --limit <number>     Results per page (default: 20)
  --json               Output as JSON
```

**Behavior**:
1. Call `StockyardClient.search()`
2. Display results with metadata
3. Support pagination

**Output Example**:
```
Search Results (3 of 45)

NAME              TYPE    VERSION    AUTHOR     DOWNLOADS    RATING
sample-agent      agent   2.1.0      fractary   5,432        4.8/5
test-agent        agent   1.0.0      john       1,234        4.2/5
demo-tool         tool    3.0.0      jane       8,901        4.9/5

Showing 1-3 of 45 results. Use --page 2 for next page.
```

### 2.10 `forge login`

**Purpose**: Authenticate with Stockyard

**Usage**:
```bash
fractary forge login [options]

Options:
  --token <token>      Provide token directly
```

**Behavior**:
1. Prompt for token (or use `--token`)
2. Validate token with Stockyard API
3. Store token in config file
4. Display authenticated user info

**Interactive Flow**:
```
Login to Stockyard
==================

Visit: https://stockyard.fractary.dev/settings/tokens
Generate a new personal access token and paste it below:

Token: ****************************************

✓ Logged in as john_doe (john@example.com)
```

### 2.11 `forge logout`

**Purpose**: Clear Stockyard authentication

**Usage**:
```bash
fractary forge logout
```

**Behavior**:
1. Clear token from config file
2. Clear token from keychain (if stored)
3. Confirm logout

### 2.12 `forge whoami`

**Purpose**: Show current authentication status

**Usage**:
```bash
fractary forge whoami
```

**Behavior**:
1. Check authentication status
2. Display user info or "Not logged in"

**Output Example**:
```
Logged in as: john_doe
Email: john@example.com
Token source: config file
```

---

## 3. Implementation Structure

### 3.1 Directory Structure

```
cli/
├── src/
│   ├── commands/
│   │   └── forge/
│   │       ├── index.ts              # Main forge command
│   │       ├── init.ts
│   │       ├── install.ts
│   │       ├── update.ts
│   │       ├── lock.ts
│   │       ├── list.ts
│   │       ├── info.ts
│   │       ├── fork.ts
│   │       ├── merge.ts
│   │       ├── search.ts
│   │       ├── login.ts
│   │       ├── logout.ts
│   │       └── whoami.ts
│   ├── utils/
│   │   ├── forge-config.ts           # Load Forge config
│   │   ├── logger.ts                 # CLI logger
│   │   └── formatters.ts             # Output formatting
│   └── index.ts
├── package.json
└── README.md
```

### 3.2 Main Forge Command

```typescript
// cli/src/commands/forge/index.ts

import { Command } from 'commander';
import { initCommand } from './init';
import { installCommand } from './install';
import { updateCommand } from './update';
import { lockCommand } from './lock';
import { listCommand } from './list';
import { infoCommand } from './info';
import { forkCommand } from './fork';
import { mergeCommand } from './merge';
import { searchCommand } from './search';
import { loginCommand } from './login';
import { logoutCommand } from './logout';
import { whoamiCommand } from './whoami';

export const forgeCommand = new Command('forge')
  .description('Manage agents and tools with Forge')
  .addCommand(initCommand)
  .addCommand(installCommand)
  .addCommand(updateCommand)
  .addCommand(lockCommand)
  .addCommand(listCommand)
  .addCommand(infoCommand)
  .addCommand(forkCommand)
  .addCommand(mergeCommand)
  .addCommand(searchCommand)
  .addCommand(loginCommand)
  .addCommand(logoutCommand)
  .addCommand(whoamiCommand);
```

### 3.3 Configuration Helper

```typescript
// cli/src/utils/forge-config.ts

import * as fs from 'fs-extra';
import * as path from 'path';
import type { RegistryConfig } from '@fractary/forge';

export async function loadForgeConfig(): Promise<{
  registry: RegistryConfig;
  projectRoot: string;
}> {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, '.fractary/plugins/forge/config.json');

  if (!(await fs.pathExists(configPath))) {
    throw new Error(
      'Forge not initialized. Run "fractary forge init" first.'
    );
  }

  const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

  return {
    registry: {
      local: {
        enabled: true,
        paths: [
          path.join(projectRoot, '.fractary/agents'),
          path.join(projectRoot, '.fractary/tools'),
        ],
      },
      global: {
        enabled: true,
        path: config.globalPath || path.join(process.env.HOME, '.fractary/registry'),
      },
      stockyard: {
        enabled: config.stockyard?.enabled ?? false,
        url: config.stockyard?.url || 'https://stockyard.fractary.dev',
      },
    },
    projectRoot,
  };
}
```

---

## 4. Dependencies

```json
{
  "dependencies": {
    "@fractary/forge": "^1.0.0",
    "commander": "^11.0.0",
    "inquirer": "^9.0.0",
    "chalk": "^5.0.0",
    "ora": "^7.0.0",
    "cli-table3": "^0.6.3"
  },
  "devDependencies": {
    "@types/inquirer": "^9.0.0",
    "@types/cli-table3": "^0.6.0"
  }
}
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

Test each command with mocked SDK functions:

```typescript
// cli/src/commands/forge/__tests__/install.test.ts

import { installCommand } from '../install';

jest.mock('@fractary/forge');

describe('forge install', () => {
  it('should install agent successfully', async () => {
    // Mock DefinitionResolver
    // Execute command
    // Verify installation
  });

  it('should handle errors gracefully', async () => {
    // Mock error scenario
    // Execute command
    // Verify error handling
  });
});
```

### 5.2 Integration Tests

Test complete workflows:

```typescript
describe('forge workflow', () => {
  it('should init → install → lock → update', async () => {
    // Initialize project
    // Install packages
    // Generate lockfile
    // Check for updates
    // Apply updates
  });
});
```

---

## 6. User Experience Enhancements

### 6.1 Progress Indicators

Use `ora` for long-running operations:

```typescript
import ora from 'ora';

const spinner = ora('Installing my-agent...').start();
// ... perform installation
spinner.succeed('Installed my-agent@1.0.0');
```

### 6.2 Colored Output

Use `chalk` for colored terminal output:

```typescript
import chalk from 'chalk';

console.log(chalk.green('✓ Success'));
console.log(chalk.yellow('⚠ Warning'));
console.log(chalk.red('✗ Error'));
```

### 6.3 Tables

Use `cli-table3` for formatted tables:

```typescript
import Table from 'cli-table3';

const table = new Table({
  head: ['Name', 'Version', 'Source'],
});

table.push(['my-agent', '1.0.0', 'local']);
console.log(table.toString());
```

---

## 7. Implementation Checklist

### Phase 1: Core Commands (Week 1)
- [ ] Implement `forge init`
- [ ] Implement `forge install`
- [ ] Implement `forge list`
- [ ] Implement `forge info`
- [ ] Add config helper utilities
- [ ] Write unit tests
- [ ] Test basic workflows

### Phase 2: Lockfile & Updates (Week 2)
- [ ] Implement `forge lock`
- [ ] Implement `forge update`
- [ ] Add progress indicators
- [ ] Add colored output
- [ ] Write integration tests
- [ ] Test update workflows

### Phase 3: Fork & Merge (Week 3)
- [ ] Implement `forge fork`
- [ ] Implement `forge merge`
- [ ] Add conflict resolution UI
- [ ] Write tests
- [ ] Test fork workflows

### Phase 4: Stockyard & Polish (Week 4)
- [ ] Implement `forge search`
- [ ] Implement `forge login/logout/whoami`
- [ ] Polish UX (spinners, tables, colors)
- [ ] Comprehensive documentation
- [ ] User guide with examples
- [ ] Final testing

---

## 8. Documentation Requirements

### 8.1 Command Help

Each command should have comprehensive help text:

```bash
fractary forge install --help

Usage: fractary forge install [options] <name>

Install an agent or tool

Arguments:
  name                 Package name (e.g., my-agent@1.0.0)

Options:
  --type <type>        Force type: agent or tool
  --save               Update lockfile after install (default: true)
  -g, --global         Install to global registry
  -h, --help           Display help for command
```

### 8.2 User Guide

Create comprehensive user guide in `cli/docs/forge.md`:

- Getting started
- Installation guide
- Update workflows
- Fork and merge workflows
- Lockfile management
- Stockyard authentication
- Troubleshooting

---

## 9. Success Criteria

- [ ] All 12 commands implemented and working
- [ ] Comprehensive error handling and user feedback
- [ ] Progress indicators for long operations
- [ ] Colored output for better UX
- [ ] Help text for all commands
- [ ] Unit tests for all commands (>90% coverage)
- [ ] Integration tests for workflows
- [ ] User documentation complete
- [ ] No breaking changes to existing CLI commands

---

**Status**: Ready for implementation in `fractary/cli` project.

**Integration Point**: Import and use `@fractary/forge` SDK functions within each command handler.
