/**
 * Forge Registry Add Command
 *
 * Add a new registry to the configuration.
 * Supports manifest-based and Stockyard registries.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { RegistryConfig } from '@fractary/forge';
import { loadForgeConfig, saveForgeConfig } from '../../utils/forge-config.js';
import { formatSuccess, formatWarning, formatError } from '../../utils/formatters.js';

interface RegistryAddOptions {
  type?: 'manifest' | 'stockyard';
  priority?: number;
  cacheTtl?: number;
  disabled?: boolean;
  force?: boolean;
  verbose?: boolean;
}

/**
 * Create registry add command
 */
export function createRegistryAddCommand(): Command {
  const cmd = new Command('add');

  cmd
    .description('Add a new registry to configuration')
    .argument('<name>', 'Registry name (e.g., "custom", "stockyard")')
    .argument('<url>', 'Registry URL (HTTPS or file://)')
    .option('-t, --type <type>', 'Registry type: manifest or stockyard', 'manifest')
    .option('-p, --priority <number>', 'Priority (higher = checked first)', '10')
    .option('--cache-ttl <seconds>', 'Cache time-to-live in seconds', '3600')
    .option('--disabled', 'Add but keep disabled')
    .option('-f, --force', 'Skip validation checks')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (name: string, url: string, options: RegistryAddOptions) => {
      try {
        await registryAddCommand(name, url, options);
      } catch (error) {
        handleAddError(error);
      }
    });

  return cmd;
}

/**
 * Registry add command implementation
 */
async function registryAddCommand(
  name: string,
  url: string,
  options: RegistryAddOptions
): Promise<void> {
  // Validate name
  if (!isValidRegistryName(name)) {
    console.error(chalk.red('✗ Invalid registry name'));
    console.error();
    console.error(chalk.yellow('Registry name must:'));
    console.error(chalk.yellow('  • Be alphanumeric with hyphens/underscores'));
    console.error(chalk.yellow('  • Not contain spaces or special characters'));
    process.exit(1);
  }

  // Validate URL
  if (!options.force && !isValidUrl(url)) {
    console.error(chalk.red('✗ Invalid registry URL'));
    console.error();
    console.error(chalk.yellow('URL must:'));
    console.error(chalk.yellow('  • Start with https:// or file://'));
    console.error(chalk.yellow('  • Be a valid URL format'));
    console.error();
    console.error(chalk.dim('Use --force to skip validation'));
    process.exit(1);
  }

  // Validate type
  const type = options.type || 'manifest';
  if (type !== 'manifest' && type !== 'stockyard') {
    console.error(chalk.red(`✗ Invalid registry type: ${type}`));
    console.error();
    console.error(chalk.yellow('Valid types: manifest, stockyard'));
    process.exit(1);
  }

  // Parse options
  const priority = typeof options.priority === 'string'
    ? parseInt(options.priority, 10)
    : options.priority || 10;

  const cacheTtl = typeof options.cacheTtl === 'string'
    ? parseInt(options.cacheTtl, 10)
    : options.cacheTtl || 3600;

  if (isNaN(priority) || priority < 1) {
    console.error(chalk.red('✗ Priority must be a positive number'));
    process.exit(1);
  }

  if (isNaN(cacheTtl) || cacheTtl < 0) {
    console.error(chalk.red('✗ Cache TTL must be a non-negative number'));
    process.exit(1);
  }

  // Load current configuration
  const { config, configSource } = await loadForgeConfig();

  if (options.verbose) {
    console.log(chalk.dim(`Configuration source: ${configSource}`));
    console.log();
  }

  // Check if registry already exists
  if (config.registries.some((r) => r.name === name)) {
    console.error(chalk.red(`✗ Registry '${name}' already exists`));
    console.error();
    console.error(chalk.yellow('Try:'));
    console.error(chalk.yellow(`  • Use a different name`));
    console.error(chalk.yellow(`  • Remove existing: fractary-forge registry remove ${name}`));
    process.exit(1);
  }

  // Create new registry configuration
  const newRegistry: RegistryConfig = {
    name,
    type,
    url,
    enabled: !options.disabled,
    priority,
    cache_ttl: cacheTtl,
  };

  // Validate registry accessibility (unless --force)
  if (!options.force && type === 'manifest') {
    if (options.verbose) {
      console.log(chalk.cyan('Validating registry accessibility...'));
    }

    const isAccessible = await testRegistryAccess(url);

    if (!isAccessible) {
      formatWarning(`Could not access registry at ${url}`);
      console.log();
      console.log(chalk.yellow('The registry might not be accessible or might not exist.'));
      console.log(chalk.yellow('Use --force to add anyway.'));
      process.exit(1);
    }

    if (options.verbose) {
      console.log(chalk.green('✓ Registry is accessible'));
      console.log();
    }
  }

  // Add to configuration
  config.registries.push(newRegistry);

  // Sort by priority (descending)
  config.registries.sort((a, b) => b.priority - a.priority);

  // Save configuration
  await saveForgeConfig(config);

  // Display success
  console.log();
  formatSuccess(`Registry '${name}' added successfully`);
  console.log();
  console.log(`  Name:     ${chalk.cyan(name)}`);
  console.log(`  Type:     ${chalk.cyan(type)}`);
  console.log(`  URL:      ${chalk.cyan(url)}`);
  console.log(`  Status:   ${newRegistry.enabled ? chalk.green('Enabled') : chalk.red('Disabled')}`);
  console.log(`  Priority: ${chalk.cyan(priority.toString())}`);
  console.log(`  Cache:    ${chalk.cyan(`${cacheTtl}s`)}`);
  console.log();

  if (config.registries.length > 1) {
    console.log(
      chalk.dim(
        `Total registries: ${config.registries.length} (sorted by priority)`
      )
    );
  }

  process.exit(0);
}

/**
 * Validate registry name
 */
function isValidRegistryName(name: string): boolean {
  // Alphanumeric with hyphens and underscores
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'file:';
  } catch (error) {
    return false;
  }
}

/**
 * Test if registry is accessible
 */
async function testRegistryAccess(url: string): Promise<boolean> {
  try {
    // For file:// URLs, just check if valid
    if (url.startsWith('file://')) {
      return true;
    }

    // For HTTPS URLs, try to fetch
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Handle add command errors
 */
function handleAddError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('config')) {
    hints.push('Configuration error');
    hints.push('Run: fractary-forge init');
  } else if (err.message.includes('permission')) {
    hints.push('Permission denied writing config');
    hints.push('Check file permissions');
  }

  formatError(err, 'Registry add failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createRegistryAddCommand;
