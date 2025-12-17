/**
 * Forge Cache Stats Command
 *
 * Display cache statistics and detailed information.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import {
  getCacheStats,
  getCacheDirectory,
  getAllCacheEntries,
  loadCacheMetadata,
} from '../../utils/cache-manager.js';
import { formatError } from '../../utils/formatters.js';

interface CacheStatsOptions {
  json?: boolean;
  verbose?: boolean;
  registries?: boolean;
}

/**
 * Create cache stats command
 */
export function createCacheStatsCommand(): Command {
  const cmd = new Command('stats');

  cmd
    .description('Show cache statistics and information')
    .option('--json', 'Output as JSON for scripting')
    .option('-v, --verbose', 'Show detailed breakdown')
    .option('--registries', 'Show only registry-specific stats')
    .action(async (options: CacheStatsOptions) => {
      try {
        await cacheStatsCommand(options);
      } catch (error) {
        handleStatsError(error);
      }
    });

  return cmd;
}

/**
 * Cache stats command implementation
 */
async function cacheStatsCommand(options: CacheStatsOptions): Promise<void> {
  const stats = await getCacheStats();
  const entries = await getAllCacheEntries();
  const metadata = await loadCacheMetadata();
  const cacheDir = getCacheDirectory();

  if (options.json) {
    // JSON output
    const jsonOutput = {
      cache_directory: cacheDir,
      total_entries: stats.entry_count,
      total_size_bytes: stats.size_bytes,
      total_size_mb: Number((stats.size_bytes / (1024 * 1024)).toFixed(2)),
      statistics: {
        total_hits: stats.total_cache_hits,
        total_misses: stats.total_cache_misses,
        hit_ratio: Number(stats.hit_ratio.toFixed(4)),
        avg_entry_age_seconds: stats.avg_entry_age_seconds,
      },
      registries: Object.entries(entries).map(([name, entry]) => ({
        name,
        file: entry.file,
        size_bytes: entry.size_bytes,
        size_kb: Number((entry.size_bytes / 1024).toFixed(2)),
        cached_at: entry.cached_at,
        expires_at: entry.expires_at,
        ttl_seconds: entry.ttl,
        hits: entry.hits,
        misses: entry.misses,
        hit_ratio: entry.hits + entry.misses > 0
          ? Number((entry.hits / (entry.hits + entry.misses)).toFixed(4))
          : 0,
      })),
    };

    console.log(JSON.stringify(jsonOutput, null, 2));
    process.exit(0);
  }

  // Text output
  console.log();
  console.log(chalk.bold('Cache Statistics'));
  console.log();
  console.log(`  Location: ${chalk.cyan(cacheDir)}`);
  console.log(`  Total Entries: ${chalk.cyan(stats.entry_count.toString())}`);
  console.log(
    `  Total Size: ${chalk.cyan(`${(stats.size_bytes / 1024).toFixed(2)} KB`)} (${chalk.dim(`${(stats.size_bytes / (1024 * 1024)).toFixed(2)} MB`)})`
  );
  console.log();

  // Performance statistics
  console.log(chalk.bold('Performance'));
  console.log();

  const totalRequests = stats.total_cache_hits + stats.total_cache_misses;
  const hitRatioPercent = (stats.hit_ratio * 100).toFixed(1);

  console.log(`  Cache Hits: ${chalk.green(stats.total_cache_hits.toString())}`);
  console.log(`  Cache Misses: ${chalk.yellow(stats.total_cache_misses.toString())}`);
  console.log(
    `  Hit Ratio: ${chalk.cyan(`${hitRatioPercent}%`)} ${chalk.dim(`(${totalRequests} total requests)`)}`
  );
  console.log(`  Avg Entry Age: ${chalk.cyan(`${stats.avg_entry_age_seconds}s`)}`);
  console.log();

  // Registry-specific stats if requested or verbose
  if (!options.registries && (options.verbose || Object.keys(entries).length > 0)) {
    console.log(chalk.bold('Registry Cache Entries'));
    console.log();

    if (Object.keys(entries).length === 0) {
      console.log(chalk.dim('  No cached entries'));
    } else {
      const table = new Table({
        head: [
          'Registry',
          'Size (KB)',
          'Cached',
          'Expires',
          'Hits',
          'Misses',
          'Hit %',
        ],
        colWidths: [20, 12, 20, 20, 8, 8, 8],
        style: { head: [], border: ['grey'] },
      });

      // Sort by size (largest first)
      const sortedEntries = Object.entries(entries).sort(
        ([, a], [, b]) => b.size_bytes - a.size_bytes
      );

      for (const [registryName, entry] of sortedEntries) {
        const cachedDate = new Date(entry.cached_at);
        const expiresDate = new Date(entry.expires_at);
        const now = new Date();
        const isExpired = expiresDate < now;

        const cachedStr = cachedDate.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const expiresStr = isExpired
          ? chalk.red(`${expiresDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (exp)`)
          : expiresDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

        const totalHitsMisses = entry.hits + entry.misses;
        const hitPercent = totalHitsMisses > 0
          ? ((entry.hits / totalHitsMisses) * 100).toFixed(0)
          : '0';

        table.push([
          registryName,
          (entry.size_bytes / 1024).toFixed(1),
          cachedStr,
          expiresStr,
          entry.hits.toString(),
          entry.misses.toString(),
          `${hitPercent}%`,
        ]);
      }

      console.log(table.toString());
    }

    console.log();
  }

  // Additional details in verbose mode
  if (options.verbose) {
    console.log(chalk.bold('Cache Metadata'));
    console.log();
    console.log(`  Metadata Version: ${chalk.cyan(metadata.version)}`);
    console.log(`  Created: ${chalk.dim(new Date(metadata.created_at).toLocaleString())}`);
    console.log(`  Last Updated: ${chalk.dim(new Date(metadata.last_updated).toLocaleString())}`);
    console.log();
  }

  process.exit(0);
}

/**
 * Handle stats command errors
 */
function handleStatsError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('cache')) {
    hints.push('Cache error occurred');
    hints.push('Check cache directory permissions');
  } else if (err.message.includes('permission')) {
    hints.push('Permission denied accessing cache');
    hints.push('Check file/directory permissions');
  }

  formatError(err, 'Cache stats failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createCacheStatsCommand;
