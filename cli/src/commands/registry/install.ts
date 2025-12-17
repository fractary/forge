/**
 * Forge Install Command
 *
 * Install plugins and components from registries using the @fractary/forge Registry SDK.
 * Supports various installation options including scope, component filtering, and dry-run.
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { Registry } from '@fractary/forge';
import { loadForgeConfig } from '../../utils/forge-config.js';
import {
  formatInstallResult,
  formatError,
  formatWarning,
  createProgressMessage,
} from '../../utils/formatters.js';

interface InstallCommandOptions {
  global?: boolean;
  force?: boolean;
  agentsOnly?: boolean;
  toolsOnly?: boolean;
  workflowsOnly?: boolean;
  noHooks?: boolean;
  noCommands?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  save?: boolean;
}

/**
 * Create install command
 */
export function createInstallCommand(): Command {
  const cmd = new Command('install');

  cmd
    .description('Install a plugin from registry')
    .argument('<plugin>', 'Plugin name (e.g., @fractary/faber-plugin or @fractary/faber-plugin@1.0.0)')
    .option('-g, --global', 'Install globally to ~/.fractary/registry')
    .option('-f, --force', 'Force reinstall if already installed')
    .option('--agents-only', 'Install only agents')
    .option('--tools-only', 'Install only tools')
    .option('--workflows-only', 'Install only workflows')
    .option('--no-hooks', 'Skip installing hooks')
    .option('--no-commands', 'Skip installing commands')
    .option('--dry-run', 'Preview what would be installed without actually installing')
    .option('-v, --verbose', 'Show detailed installation progress')
    .option('--save', 'Update lockfile after install (default: true)', true)
    .action(async (pluginName: string, options: InstallCommandOptions) => {
      try {
        await installCommand(pluginName, options);
      } catch (error) {
        handleInstallError(error, pluginName);
      }
    });

  return cmd;
}

/**
 * Install command implementation
 */
async function installCommand(pluginName: string, options: InstallCommandOptions): Promise<void> {
  // Parse plugin name and version
  const { name, version } = parsePluginIdentifier(pluginName);

  // Load configuration
  const { config, configSource } = await loadForgeConfig();

  if (options.verbose) {
    console.log(chalk.dim(`Using ${configSource} configuration`));
    console.log(chalk.dim(`Registries: ${config.registries.map((r) => r.name).join(', ')}`));
  }

  // Build install options
  const installOptions = {
    scope: options.global ? ('global' as const) : ('local' as const),
    force: options.force || false,
    agentsOnly: options.agentsOnly || false,
    toolsOnly: options.toolsOnly || false,
    workflowsOnly: options.workflowsOnly || false,
    noHooks: !options.noHooks, // Commander negates the flag
    noCommands: !options.noCommands,
    dryRun: options.dryRun || false,
  };

  // Validate options
  validateInstallOptions(installOptions);

  // Show what we're doing
  const scopeText = installOptions.scope === 'global' ? 'globally' : 'locally';
  const versionText = version ? `@${version}` : '';
  const actionText = installOptions.dryRun ? 'Would install' : 'Installing';

  if (options.verbose) {
    console.log();
    console.log(chalk.cyan(`${actionText} ${name}${versionText} ${scopeText}...`));
    console.log();
  }

  // Create progress spinner
  const spinner = ora(createProgressMessage('Installing', `${name}${versionText}`)).start();

  try {
    // Call SDK installer
    const result = await Registry.installer.installPlugin(name, installOptions);

    // Stop spinner
    spinner.succeed();

    // Display results
    formatInstallResult(result, { verbose: options.verbose });

    // Success exit
    process.exit(0);
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

/**
 * Parse plugin identifier (name@version)
 */
function parsePluginIdentifier(identifier: string): { name: string; version?: string } {
  const parts = identifier.split('@');

  // Handle scoped packages (@org/package or @org/package@version)
  if (identifier.startsWith('@')) {
    if (parts.length === 2) {
      // @org/package
      return { name: `@${parts[1]}` };
    } else if (parts.length === 3) {
      // @org/package@version
      return { name: `@${parts[1]}`, version: parts[2] };
    }
  } else {
    // Regular package or package@version
    if (parts.length === 1) {
      return { name: parts[0] };
    } else if (parts.length === 2) {
      return { name: parts[0], version: parts[1] };
    }
  }

  throw new Error(`Invalid plugin identifier: ${identifier}`);
}

/**
 * Validate install options
 */
function validateInstallOptions(options: any): void {
  // Check for conflicting component filters
  const filters = [
    options.agentsOnly,
    options.toolsOnly,
    options.workflowsOnly,
  ].filter(Boolean);

  if (filters.length > 1) {
    throw new Error(
      'Cannot specify multiple component filters (--agents-only, --tools-only, --workflows-only). Choose one.'
    );
  }
}

/**
 * Handle installation errors with contextual help
 */
function handleInstallError(error: unknown, pluginName: string): never {
  const err = error as Error;

  // Determine error type and provide helpful hints
  const hints: string[] = [];

  if (err.message.includes('not found')) {
    hints.push('Check plugin name spelling');
    hints.push(`Run: fractary-forge search ${pluginName.split('@')[0]}`);
    hints.push('Verify registry is configured: fractary-forge registry list');
  } else if (err.message.includes('checksum') || err.message.includes('integrity')) {
    hints.push('Corrupted download or network issue');
    hints.push('Try again with --force flag');
    hints.push('Clear cache: fractary-forge cache clear');
  } else if (err.message.includes('permission') || err.message.includes('EACCES')) {
    hints.push('Permission denied');
    hints.push('Try with sudo for global install: sudo fractary-forge install <name> --global');
    hints.push('Check file permissions');
  } else if (err.message.includes('already installed') || err.message.includes('already exists')) {
    hints.push('Plugin is already installed');
    hints.push('Use --force to reinstall');
    hints.push('Or uninstall first: fractary-forge uninstall <name>');
  } else if (err.message.includes('network') || err.message.includes('ENOTFOUND')) {
    hints.push('Network error - check internet connection');
    hints.push('Verify registry URL is accessible');
    hints.push('Try again later');
  }

  formatError(err, 'Installation failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createInstallCommand;
