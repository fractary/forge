/**
 * Fractary Forge CLI
 *
 * Command-line interface for creating, managing, and publishing AI agent definitions
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';

// Agent/Tool commands
import { initCommand } from './commands/init.js';
import { agentCreateCommand } from './commands/agent/create.js';
import { agentInfoCommand } from './commands/agent/info.js';
import { agentListCommand } from './commands/agent/list.js';
import { agentValidateCommand } from './commands/agent/validate.js';
import { toolCreateCommand } from './commands/tool/create.js';
import { toolInfoCommand } from './commands/tool/info.js';
import { toolListCommand } from './commands/tool/list.js';
import { toolValidateCommand } from './commands/tool/validate.js';

// Registry commands
import {
  createInstallCommand,
  createUninstallCommand,
  createListCommand,
  createInfoCommand,
  createSearchCommand,
  createLockCommand,
  createUpdateCommand,
  createRegistryCommand,
  createCacheCommand,
  createForkCommand,
  createMergeCommand,
  createLoginCommand,
  createLogoutCommand,
  createWhoamiCommand,
} from './commands/registry/index.js';

/**
 * Get package version from package.json
 */
function getVersion(): string {
  try {
    // In CommonJS, __dirname is automatically available
    // From dist/src/index.js, go up two levels to reach /cli/package.json
    const packagePath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
  } catch (error) {
    console.error('Failed to read version:', error);
    return '1.0.0';
  }
}

/**
 * Create and configure the main CLI program
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('fractary-forge')
    .description('Command-line interface for Fractary Forge - Create, manage, and publish AI agent definitions')
    .version(getVersion());

  // Configuration commands
  program.addCommand(initCommand());

  // Agent management commands
  program.addCommand(agentCreateCommand());
  program.addCommand(agentInfoCommand());
  program.addCommand(agentListCommand());
  program.addCommand(agentValidateCommand());

  // Tool management commands
  program.addCommand(toolCreateCommand());
  program.addCommand(toolInfoCommand());
  program.addCommand(toolListCommand());
  program.addCommand(toolValidateCommand());

  // Registry management commands
  program.addCommand(createInstallCommand());
  program.addCommand(createUninstallCommand());
  program.addCommand(createListCommand());
  program.addCommand(createInfoCommand());
  program.addCommand(createSearchCommand());
  program.addCommand(createLockCommand());
  program.addCommand(createUpdateCommand());
  program.addCommand(createRegistryCommand());
  program.addCommand(createCacheCommand());
  program.addCommand(createForkCommand());
  program.addCommand(createMergeCommand());
  program.addCommand(createLoginCommand());
  program.addCommand(createLogoutCommand());
  program.addCommand(createWhoamiCommand());

  return program;
}

/**
 * Main entry point for the CLI
 */
export async function main(): Promise<void> {
  const program = createProgram();
  await program.parseAsync(process.argv);
}
