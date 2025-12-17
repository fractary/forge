/**
 * Forge Registry Remove Command
 *
 * Remove a registry from the configuration.
 * Prevents removing the last registry.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadForgeConfig, saveForgeConfig } from '../../utils/forge-config.js';
import { formatSuccess, formatWarning, formatError } from '../../utils/formatters.js';

interface RegistryRemoveOptions {
  force?: boolean;
  yes?: boolean;
  verbose?: boolean;
}

/**
 * Create registry remove command
 */
export function createRegistryRemoveCommand(): Command {
  const cmd = new Command('remove');

  cmd
    .description('Remove a registry from configuration')
    .argument('<name>', 'Registry name to remove')
    .option('-f, --force', 'Force removal without confirmation')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (name: string, options: RegistryRemoveOptions) => {
      try {
        await registryRemoveCommand(name, options);
      } catch (error) {
        handleRemoveError(error);
      }
    });

  return cmd;
}

/**
 * Registry remove command implementation
 */
async function registryRemoveCommand(
  name: string,
  options: RegistryRemoveOptions
): Promise<void> {
  // Load current configuration
  const { config, configSource } = await loadForgeConfig();

  if (options.verbose) {
    console.log(chalk.dim(`Configuration source: ${configSource}`));
    console.log();
  }

  // Find registry
  const registryIndex = config.registries.findIndex((r) => r.name === name);

  if (registryIndex === -1) {
    console.log(chalk.yellow(`⚠ Registry '${name}' not found`));
    console.log();
    console.log(chalk.dim('List registries with:'));
    console.log(chalk.cyan('  fractary-forge registry list'));
    process.exit(0);
  }

  const registry = config.registries[registryIndex];

  // Prevent removing the last registry
  if (config.registries.length === 1) {
    console.error(chalk.red('✗ Cannot remove the last registry'));
    console.error();
    console.error(chalk.yellow('At least one registry must be configured.'));
    console.error(chalk.yellow('Add another registry before removing this one:'));
    console.error(chalk.cyan('  fractary-forge registry add <name> <url>'));
    process.exit(1);
  }

  // Show what will be removed
  if (!options.force && !options.yes) {
    console.log();
    console.log(chalk.bold('Registry to be removed:'));
    console.log();
    console.log(`  Name:     ${chalk.cyan(registry.name)}`);
    console.log(`  Type:     ${chalk.cyan(registry.type)}`);
    console.log(`  URL:      ${chalk.cyan(registry.url)}`);
    console.log(`  Priority: ${chalk.cyan(registry.priority.toString())}`);
    console.log();

    // Confirm removal
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Remove registry '${chalk.bold(name)}'?`,
        default: false,
      },
    ]);

    if (!answer.confirm) {
      console.log(chalk.dim('Removal cancelled'));
      process.exit(0);
    }
  }

  // Remove from configuration
  config.registries.splice(registryIndex, 1);

  // Save configuration
  await saveForgeConfig(config);

  // Display success
  console.log();
  formatSuccess(`Registry '${name}' removed`);

  if (config.registries.length > 0) {
    console.log();
    console.log(chalk.dim(`Remaining registries: ${config.registries.length}`));

    if (options.verbose) {
      console.log();
      console.log(chalk.dim('Active registries:'));
      config.registries.forEach((r) => {
        const status = r.enabled ? chalk.green('✓') : chalk.red('✗');
        console.log(chalk.dim(`  ${status} ${r.name} (priority: ${r.priority})`));
      });
    }
  }

  process.exit(0);
}

/**
 * Handle remove command errors
 */
function handleRemoveError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('config')) {
    hints.push('Configuration error');
    hints.push('Run: fractary-forge init');
  } else if (err.message.includes('permission')) {
    hints.push('Permission denied writing config');
    hints.push('Check file permissions');
  }

  formatError(err, 'Registry remove failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createRegistryRemoveCommand;
