/**
 * Forge Lock Command
 *
 * Generate or update lockfile with exact versions of installed components.
 * Enables reproducible installations across machines.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import {
  generateLockfile,
  saveLockfile,
  loadLockfile,
  summarizeLockfile,
  getLocalLockfilePath,
} from '../../utils/lockfile-manager.js';
import { formatSuccess, formatWarning, formatError } from '../../utils/formatters.js';

interface LockCommandOptions {
  update?: boolean;
  force?: boolean;
  verbose?: boolean;
}

/**
 * Create lock command
 */
export function createLockCommand(): Command {
  const cmd = new Command('lock');

  cmd
    .description('Generate or update lockfile with exact component versions')
    .option('-u, --update', 'Update existing lockfile with current versions')
    .option('-f, --force', 'Force regenerate lockfile even if already exists')
    .option('-v, --verbose', 'Show detailed lockfile information')
    .action(async (options: LockCommandOptions) => {
      try {
        await lockCommand(options);
      } catch (error) {
        handleLockError(error);
      }
    });

  return cmd;
}

/**
 * Lock command implementation
 */
async function lockCommand(options: LockCommandOptions): Promise<void> {
  const lockfilePath = await getLocalLockfilePath();
  const lockfileRelPath = path.relative(process.cwd(), lockfilePath);

  if (options.verbose) {
    console.log(chalk.dim(`Lockfile path: ${lockfileRelPath}`));
    console.log();
  }

  // Check if lockfile exists
  const existingLock = await loadLockfile(lockfilePath);

  if (existingLock && !options.update && !options.force) {
    console.log(chalk.yellow(`⚠ Lockfile already exists at ${lockfileRelPath}`));
    console.log();
    console.log(chalk.dim('Use one of:'));
    console.log(chalk.cyan('  fractary-forge lock --update'));
    console.log(chalk.cyan('  fractary-forge lock --force'));
    process.exit(1);
  }

  if (options.verbose) {
    console.log(chalk.cyan('Generating lockfile from installed components...'));
    console.log();
  }

  try {
    // Generate lockfile from current installed components
    const lockfile = await generateLockfile(process.cwd(), {
      update: options.update,
    });

    // Save lockfile
    await saveLockfile(lockfile, lockfilePath);

    // Display summary
    const summary = summarizeLockfile(lockfile);

    console.log();
    formatSuccess(`Lockfile created: ${lockfileRelPath}`);
    console.log();

    // Show component counts
    if (summary.agents > 0) {
      console.log(`  • ${summary.agents} agent(s)`);
    }
    if (summary.tools > 0) {
      console.log(`  • ${summary.tools} tool(s)`);
    }
    if (summary.workflows > 0) {
      console.log(`  • ${summary.workflows} workflow(s)`);
    }
    if (summary.templates > 0) {
      console.log(`  • ${summary.templates} template(s)`);
    }

    if (summary.totalComponents === 0) {
      console.log(chalk.dim('  (no components installed)'));
    } else {
      console.log();
      console.log(
        chalk.dim(`Total: ${summary.totalComponents} component(s) locked`)
      );
    }

    if (options.verbose) {
      console.log();
      console.log(chalk.dim(`Timestamp: ${lockfile.timestamp}`));
      console.log(chalk.dim(`Version: ${lockfile.lockfile_version}`));
    }

    console.log();

    if (existingLock && options.update) {
      console.log(
        chalk.dim(
          'Lockfile updated. Commit changes to track in version control.'
        )
      );
    } else {
      console.log(
        chalk.dim(
          'Lockfile created. Commit to version control for reproducible installations.'
        )
      );
    }

    process.exit(0);
  } catch (error) {
    throw error;
  }
}

/**
 * Handle lock command errors
 */
function handleLockError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('permission') || err.message.includes('EACCES')) {
    hints.push('Permission denied writing to .fractary directory');
    hints.push('Check file permissions or run with sudo');
  } else if (err.message.includes('ENOENT')) {
    hints.push('Directory not found');
    hints.push('Run: fractary-forge init');
  } else if (err.message.includes('no components')) {
    hints.push('No components currently installed');
    hints.push('Install components first: fractary-forge install <plugin>');
  }

  formatError(err, 'Lockfile generation failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createLockCommand;
