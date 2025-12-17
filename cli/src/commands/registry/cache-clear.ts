/**
 * Forge Cache Clear Command
 *
 * Clear cached registry manifests by pattern or age.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  clearCache,
  getCacheDirectory,
  getAllCacheEntries,
  isEntryExpired,
} from '../../utils/cache-manager.js';
import { formatSuccess, formatWarning, formatError } from '../../utils/formatters.js';

interface CacheClearOptions {
  pattern?: string;
  olderThan?: number;
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Create cache clear command
 */
export function createCacheClearCommand(): Command {
  const cmd = new Command('clear');

  cmd
    .description('Clear cached registry manifests')
    .argument('[pattern]', 'Optional registry name pattern to clear (regex)')
    .option('-o, --older-than <seconds>', 'Clear entries older than N seconds')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('--dry-run', 'Show what would be cleared without deleting')
    .option('-v, --verbose', 'Show detailed clearing process')
    .action(async (pattern: string | undefined, options: CacheClearOptions) => {
      try {
        await cacheClearCommand(pattern, options);
      } catch (error) {
        handleClearError(error);
      }
    });

  return cmd;
}

/**
 * Cache clear command implementation
 */
async function cacheClearCommand(pattern: string | undefined, options: CacheClearOptions): Promise<void> {
  // Validate olderThan option if provided
  if (options.olderThan !== undefined) {
    const olderThan = typeof options.olderThan === 'string'
      ? parseInt(options.olderThan, 10)
      : options.olderThan;

    if (isNaN(olderThan) || olderThan < 0) {
      console.error(chalk.red('✗ Invalid --older-than value'));
      console.error(chalk.yellow('Must be a non-negative number of seconds'));
      process.exit(1);
    }
  }

  // Validate pattern if provided
  if (pattern) {
    try {
      new RegExp(pattern, 'i');
    } catch (error) {
      console.error(chalk.red('✗ Invalid regex pattern'));
      console.error(chalk.yellow(`Pattern: ${pattern}`));
      process.exit(1);
    }
  }

  if (options.verbose) {
    console.log(chalk.dim(`Cache directory: ${getCacheDirectory()}`));
    if (pattern) console.log(chalk.dim(`Pattern: ${pattern}`));
    if (options.olderThan !== undefined) console.log(chalk.dim(`Older than: ${options.olderThan}s`));
    console.log();
  }

  // Get current cache entries
  const entries = await getAllCacheEntries();
  const entryNames = Object.keys(entries);

  if (entryNames.length === 0) {
    console.log(chalk.yellow('ℹ No cache entries found'));
    process.exit(0);
  }

  // Determine which entries would be cleared
  const toClear: string[] = [];

  for (const registryName of entryNames) {
    const entry = entries[registryName];
    let shouldClear = false;

    // Check pattern match
    if (pattern) {
      const regex = new RegExp(pattern, 'i');
      shouldClear = regex.test(registryName);
    } else if (options.olderThan !== undefined) {
      const olderThan = typeof options.olderThan === 'string'
        ? parseInt(options.olderThan, 10)
        : options.olderThan;

      const cacheTime = new Date(entry.cached_at);
      const now = new Date();
      const ageSeconds = (now.getTime() - cacheTime.getTime()) / 1000;

      shouldClear = ageSeconds > olderThan;
    } else {
      // Clear all entries if no pattern or age specified
      shouldClear = true;
    }

    if (shouldClear) {
      toClear.push(registryName);
    }
  }

  if (toClear.length === 0) {
    console.log(chalk.yellow('ℹ No cache entries match the criteria'));
    process.exit(0);
  }

  // Show what will be cleared
  if (options.verbose || !options.force) {
    console.log(chalk.bold(`Entries to be cleared (${toClear.length}):`));
    console.log();

    toClear.forEach((registryName) => {
      const entry = entries[registryName];
      const expired = isEntryExpired(entry);
      const status = expired ? chalk.yellow('(expired)') : chalk.green('(active)');
      const size = (entry.size_bytes / 1024).toFixed(2);

      console.log(`  ${chalk.cyan(registryName)} ${status}`);
      if (options.verbose) {
        console.log(chalk.dim(`    File: ${entry.file}`));
        console.log(chalk.dim(`    Size: ${size} KB`));
        console.log(chalk.dim(`    Cached: ${new Date(entry.cached_at).toLocaleString()}`));
        console.log(chalk.dim(`    Hits: ${entry.hits}, Misses: ${entry.misses}`));
      }
    });

    console.log();
  }

  // Show total size
  const totalSize = toClear.reduce((sum, name) => sum + entries[name].size_bytes, 0);
  console.log(chalk.dim(`Total size to clear: ${(totalSize / 1024).toFixed(2)} KB`));
  console.log();

  // Show dry-run notice
  if (options.dryRun) {
    console.log(chalk.cyan('(DRY RUN - no changes will be made)'));
    console.log();
  }

  // Confirm unless --force
  if (!options.force && !options.dryRun) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Clear ${toClear.length} cache entr${toClear.length === 1 ? 'y' : 'ies'}?`,
        default: false,
      },
    ]);

    if (!answer.confirm) {
      console.log(chalk.dim('Cache clear cancelled'));
      process.exit(0);
    }
  }

  // Clear cache
  const olderThan = typeof options.olderThan === 'string'
    ? parseInt(options.olderThan, 10)
    : options.olderThan;

  const result = await clearCache({
    pattern,
    olderThan,
    dryRun: options.dryRun,
  });

  // Display result
  console.log();

  if (options.dryRun) {
    console.log(chalk.cyan(`Would clear ${result.cleared} cache entr${result.cleared === 1 ? 'y' : 'ies'}`));
  } else {
    if (result.cleared > 0) {
      formatSuccess(`Cleared ${result.cleared} cache entr${result.cleared === 1 ? 'y' : 'ies'}`);
    } else {
      console.log(chalk.yellow('ℹ No cache entries were cleared'));
    }
  }

  if (options.verbose && result.entries.length > 0) {
    console.log();
    console.log(chalk.dim('Cleared entries:'));
    result.entries.forEach((name) => {
      console.log(chalk.dim(`  • ${name}`));
    });
  }

  console.log();
  process.exit(0);
}

/**
 * Handle clear command errors
 */
function handleClearError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('cache')) {
    hints.push('Cache error occurred');
    hints.push('Check cache directory permissions');
  } else if (err.message.includes('permission')) {
    hints.push('Permission denied accessing cache');
    hints.push('Check file/directory permissions');
  }

  formatError(err, 'Cache clear failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createCacheClearCommand;
