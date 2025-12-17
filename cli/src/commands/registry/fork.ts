/**
 * Forge Fork Command
 *
 * Create a local fork of a component with optional rename.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  createFork,
  generateForkName,
  loadComponentMetadata,
  isValidForkName,
  ForkOptions,
} from '../../utils/fork-manager.js';
import { formatSuccess, formatWarning, formatError } from '../../utils/formatters.js';

interface ForkCommandOptions {
  source?: 'installed' | 'registry';
  registry?: string;
  path?: string;
  description?: string;
  updateMetadata?: boolean;
  withGit?: boolean;
  verbose?: boolean;
}

/**
 * Create fork command
 */
export function createForkCommand(): Command {
  const cmd = new Command('fork');

  cmd
    .description('Create a local fork of a component')
    .argument('<source>', 'Component to fork (e.g., "registry/name" or just "name")')
    .argument('[name]', 'Optional new name for fork (auto-generated if not provided)')
    .option('-s, --source <type>', 'Source type: installed or registry (default: registry)', 'registry')
    .option('-r, --registry <name>', 'Specific registry to search')
    .option('-p, --path <dir>', 'Destination path for fork')
    .option('-d, --description <text>', 'Update component description')
    .option('-m, --update-metadata', 'Prompt to update component metadata')
    .option('--with-git', 'Initialize git tracking for fork')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (source: string, name: string | undefined, options: ForkCommandOptions) => {
      try {
        await forkCommand(source, name, options);
      } catch (error) {
        handleForkError(error);
      }
    });

  return cmd;
}

/**
 * Fork command implementation
 */
async function forkCommand(
  source: string,
  name: string | undefined,
  options: ForkCommandOptions
): Promise<void> {
  // Validate name if provided
  if (name && !isValidForkName(name)) {
    console.error(chalk.red('✗ Invalid fork name'));
    console.error();
    console.error(chalk.yellow('Fork name must:'));
    console.error(chalk.yellow('  • Be alphanumeric with hyphens/underscores'));
    console.error(chalk.yellow('  • Not contain spaces or special characters'));
    process.exit(1);
  }

  if (options.verbose) {
    console.log(chalk.dim(`Source: ${source}`));
    console.log(chalk.dim(`Source Type: ${options.source || 'registry'}`));
    if (name) console.log(chalk.dim(`New Name: ${name}`));
    if (options.path) console.log(chalk.dim(`Destination: ${options.path}`));
    console.log();
  }

  // For now, provide basic fork functionality
  // In a real implementation, this would:
  // 1. Locate the source component (from registry or installed)
  // 2. Load its metadata
  // 3. Generate fork name if not provided
  // 4. Create the fork using fork-manager
  // 5. Update metadata
  // 6. Optional: Initialize git tracking

  console.log();
  console.log(chalk.yellow('Fork operation requires component location'));
  console.log(chalk.dim('This feature will be fully implemented in a future release'));
  console.log();

  // Display what would happen
  console.log(chalk.bold('Fork Summary:'));
  console.log();
  console.log(`  Original Component: ${chalk.cyan(source)}`);
  console.log(`  Fork Name: ${chalk.cyan(name || '(auto-generated)')}`);
  if (options.path) {
    console.log(`  Destination: ${chalk.cyan(options.path)}`);
  }
  console.log(`  Description: ${options.description ? chalk.cyan(options.description) : chalk.dim('(unchanged)')}`);
  console.log();

  // Show fork tracking
  console.log(chalk.bold('Fork Metadata:'));
  console.log();
  console.log(chalk.dim('  • Fork creation date will be recorded'));
  console.log(chalk.dim('  • Original component reference will be preserved'));
  console.log(chalk.dim('  • Modifications will be tracked separately'));
  console.log();

  formatSuccess('Fork command available');
  console.log(chalk.dim('Use "fractary-forge fork --help" for more information'));
  console.log();

  process.exit(0);
}

/**
 * Handle fork command errors
 */
function handleForkError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('not found')) {
    hints.push('Component not found');
    hints.push('Check component name and registry');
  } else if (err.message.includes('exists')) {
    hints.push('Fork name already exists');
    hints.push('Use a different name or specify --path');
  } else if (err.message.includes('permission')) {
    hints.push('Permission denied');
    hints.push('Check file/directory permissions');
  }

  formatError(err, 'Fork failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createForkCommand;
