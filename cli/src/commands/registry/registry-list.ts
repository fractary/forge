/**
 * Forge Registry List Command
 *
 * List all configured registries with their settings.
 * Shows name, type, URL, status, and priority.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { loadForgeConfig } from '../../utils/forge-config.js';
import { formatError } from '../../utils/formatters.js';

interface RegistryListOptions {
  json?: boolean;
  verbose?: boolean;
}

/**
 * Create registry list command
 */
export function createRegistryListCommand(): Command {
  const cmd = new Command('list');

  cmd
    .description('List all configured registries')
    .option('--json', 'Output as JSON')
    .option('-v, --verbose', 'Show detailed registry information')
    .action(async (options: RegistryListOptions) => {
      try {
        await registryListCommand(options);
      } catch (error) {
        handleListError(error);
      }
    });

  return cmd;
}

/**
 * Registry list command implementation
 */
async function registryListCommand(options: RegistryListOptions): Promise<void> {
  // Load configuration
  const { config, configSource } = await loadForgeConfig();

  if (options.verbose && !options.json) {
    console.log(chalk.dim(`Configuration source: ${configSource}`));
    console.log();
  }

  // Check if any registries configured
  if (!config.registries || config.registries.length === 0) {
    console.log(chalk.yellow('No registries configured'));
    console.log();
    console.log(chalk.dim('Add a registry with:'));
    console.log(chalk.cyan('  fractary-forge registry add <name> <url>'));
    process.exit(0);
  }

  // Output as JSON
  if (options.json) {
    console.log(JSON.stringify(config.registries, null, 2));
    process.exit(0);
  }

  // Display as table
  console.log();
  console.log(chalk.bold.cyan('Configured Registries'));
  console.log(chalk.dim('─'.repeat(100)));
  console.log();

  const table = new Table({
    head: [
      'Name',
      'Type',
      'URL',
      'Status',
      'Priority',
      ...(options.verbose ? ['Cache TTL'] : []),
    ].map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
    },
    colWidths: [20, 12, 50, 10, 10, ...(options.verbose ? [12] : [])],
  });

  for (const registry of config.registries) {
    const row = [
      registry.name,
      registry.type,
      truncateUrl(registry.url, 45),
      registry.enabled ? chalk.green('Enabled') : chalk.red('Disabled'),
      registry.priority.toString(),
    ];

    if (options.verbose) {
      row.push(`${registry.cache_ttl || 3600}s`);
    }

    table.push(row);
  }

  console.log(table.toString());
  console.log();
  console.log(chalk.dim(`Total: ${config.registries.length} registr${config.registries.length === 1 ? 'y' : 'ies'}`));

  if (options.verbose) {
    console.log();
    console.log(chalk.dim('Registry priority: Higher numbers are checked first'));
    console.log(chalk.dim('Cache TTL: How long manifests are cached (in seconds)'));
  }

  process.exit(0);
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) return url;

  const start = url.substring(0, maxLength - 3);
  return `${start}...`;
}

/**
 * Handle list command errors
 */
function handleListError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('config') || err.message.includes('not found')) {
    hints.push('Configuration not found');
    hints.push('Run: fractary-forge init');
  } else if (err.message.includes('permission')) {
    hints.push('Permission denied reading config');
    hints.push('Check file permissions');
  }

  formatError(err, 'Registry list failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createRegistryListCommand;
