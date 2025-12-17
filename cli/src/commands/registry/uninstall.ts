/**
 * Forge Uninstall Command
 *
 * Uninstall plugins and components using the @fractary/forge Registry SDK.
 * Supports global and local uninstallation with confirmation prompts.
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Registry } from '@fractary/forge';
import { loadForgeConfig } from '../../utils/forge-config.js';
import {
  formatSuccess,
  formatError,
  formatWarning,
  createProgressMessage,
} from '../../utils/formatters.js';

interface UninstallCommandOptions {
  global?: boolean;
  force?: boolean;
  save?: boolean;
  yes?: boolean;
  verbose?: boolean;
}

/**
 * Create uninstall command
 */
export function createUninstallCommand(): Command {
  const cmd = new Command('uninstall');

  cmd
    .description('Uninstall a plugin')
    .argument('<plugin>', 'Plugin name (e.g., @fractary/faber-plugin)')
    .option('-g, --global', 'Uninstall from global registry (~/.fractary/registry)')
    .option('-f, --force', 'Force uninstall without confirmation')
    .option('--save', 'Update lockfile after uninstall (default: true)', true)
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('-v, --verbose', 'Show detailed uninstallation progress')
    .action(async (pluginName: string, options: UninstallCommandOptions) => {
      try {
        await uninstallCommand(pluginName, options);
      } catch (error) {
        handleUninstallError(error, pluginName);
      }
    });

  return cmd;
}

/**
 * Uninstall command implementation
 */
async function uninstallCommand(pluginName: string, options: UninstallCommandOptions): Promise<void> {
  // Parse plugin name (remove version if provided)
  const { name } = parsePluginIdentifier(pluginName);

  // Load configuration
  const { config, configSource } = await loadForgeConfig();

  if (options.verbose) {
    console.log(chalk.dim(`Using ${configSource} configuration`));
  }

  // Determine scope
  const scope = options.global ? 'global' : 'local';
  const scopeText = scope === 'global' ? 'globally' : 'locally';

  // Check if plugin is installed
  const isInstalled = await checkPluginInstalled(name, scope);

  if (!isInstalled) {
    console.log(chalk.yellow(`⚠ Plugin ${chalk.bold(name)} is not installed ${scopeText}`));
    console.log();
    console.log(chalk.dim('Run this to see installed plugins:'));
    console.log(chalk.cyan(`  fractary-forge list ${scope === 'global' ? '--global' : ''}`));
    process.exit(1);
  }

  // Confirm uninstallation (unless --force or --yes)
  if (!options.force && !options.yes) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to uninstall ${chalk.bold(name)} ${scopeText}?`,
        default: false,
      },
    ]);

    if (!answer.confirm) {
      console.log(chalk.dim('Uninstall cancelled'));
      process.exit(0);
    }
  }

  if (options.verbose) {
    console.log();
    console.log(chalk.cyan(`Uninstalling ${name} ${scopeText}...`));
    console.log();
  }

  // Create progress spinner
  const spinner = ora(createProgressMessage('Uninstalling', name)).start();

  try {
    // Call SDK uninstaller
    await Registry.installer.uninstallPlugin(name, scope);

    // Stop spinner
    spinner.succeed();

    // Display success
    formatSuccess(`Uninstalled ${name} ${scopeText}`);

    // Note about lockfile
    if (options.save && scope === 'local') {
      console.log(chalk.dim('Lockfile will be updated (--save is enabled)'));
    }

    // Success exit
    process.exit(0);
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

/**
 * Parse plugin identifier (strip version if provided)
 */
function parsePluginIdentifier(identifier: string): { name: string } {
  const parts = identifier.split('@');

  // Handle scoped packages (@org/package or @org/package@version)
  if (identifier.startsWith('@')) {
    if (parts.length === 2) {
      // @org/package
      return { name: `@${parts[1]}` };
    } else if (parts.length === 3) {
      // @org/package@version - strip version
      return { name: `@${parts[1]}` };
    }
  } else {
    // Regular package or package@version
    if (parts.length === 1) {
      return { name: parts[0] };
    } else if (parts.length === 2) {
      // package@version - strip version
      return { name: parts[0] };
    }
  }

  throw new Error(`Invalid plugin identifier: ${identifier}`);
}

/**
 * Check if plugin is installed
 */
async function checkPluginInstalled(name: string, scope: 'global' | 'local'): Promise<boolean> {
  try {
    // Use local resolver to check installation
    const listMethod = scope === 'local'
      ? Registry.localResolver.listProject.bind(Registry.localResolver)
      : Registry.localResolver.listGlobal.bind(Registry.localResolver);

    // List all component types and check if any match
    const types: Array<'agent' | 'tool' | 'workflow' | 'template'> = ['agent', 'tool', 'workflow', 'template'];

    for (const type of types) {
      const components = await listMethod(type);
      if (components.some((comp) => comp.plugin === name || comp.name === name)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    // If we can't list, assume not installed
    return false;
  }
}

/**
 * Handle uninstallation errors with contextual help
 */
function handleUninstallError(error: unknown, pluginName: string): never {
  const err = error as Error;

  // Determine error type and provide helpful hints
  const hints: string[] = [];

  if (err.message.includes('not found') || err.message.includes('not installed')) {
    hints.push('Plugin is not installed');
    hints.push(`Run: fractary-forge list`);
    hints.push(`Check spelling: ${pluginName}`);
  } else if (err.message.includes('permission') || err.message.includes('EACCES')) {
    hints.push('Permission denied');
    hints.push('Try with sudo for global uninstall: sudo fractary-forge uninstall <name> --global');
    hints.push('Check file permissions');
  } else if (err.message.includes('in use') || err.message.includes('locked')) {
    hints.push('Plugin is currently in use');
    hints.push('Close any processes using the plugin');
    hints.push('Use --force to override (risky)');
  } else if (err.message.includes('dependency') || err.message.includes('required by')) {
    hints.push('Plugin is required by other installed plugins');
    hints.push('Uninstall dependent plugins first');
    hints.push('Or use --force to uninstall anyway (may break dependencies)');
  }

  formatError(err, 'Uninstallation failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createUninstallCommand;
