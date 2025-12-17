/**
 * Forge Update Command
 *
 * Check for and install updates for installed plugins.
 * Supports updating individual plugins or all at once.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '@fractary/forge';
import {
  checkComponentUpdate,
  checkAllComponentUpdates,
  getUpdateSuggestions,
} from '../../utils/update-checker.js';
import {
  loadLockfile,
  saveLockfile,
  getLocalLockfilePath,
  mergeLockEntry,
} from '../../utils/lockfile-manager.js';
import { loadForgeConfig } from '../../utils/forge-config.js';
import { formatSuccess, formatWarning, formatError } from '../../utils/formatters.js';
import Table from 'cli-table3';

type ComponentType = 'agent' | 'tool' | 'workflow' | 'template' | 'plugin';

interface UpdateCommandOptions {
  all?: boolean;
  global?: boolean;
  dryRun?: boolean;
  major?: boolean;
  save?: boolean;
  verbose?: boolean;
}

/**
 * Create update command
 */
export function createUpdateCommand(): Command {
  const cmd = new Command('update');

  cmd
    .description('Check for and install updates for installed plugins')
    .argument('[name]', 'Plugin name (optional, updates all if not provided)')
    .option('-a, --all', 'Update all installed plugins')
    .option('-g, --global', 'Update global installations')
    .option('--major', 'Include major version updates')
    .option('--dry-run', 'Preview updates without installing')
    .option('--save', 'Update lockfile after installing (default: true)', true)
    .option('-v, --verbose', 'Show detailed update information')
    .action(async (name: string | undefined, options: UpdateCommandOptions) => {
      try {
        await updateCommand(name, options);
      } catch (error) {
        handleUpdateError(error);
      }
    });

  return cmd;
}

/**
 * Update command implementation
 */
async function updateCommand(
  pluginName: string | undefined,
  options: UpdateCommandOptions
): Promise<void> {
  // Load configuration
  const { config } = await loadForgeConfig();

  if (options.verbose) {
    console.log(chalk.dim('Checking for available updates...'));
    console.log();
  }

  // Get list of installed components
  let components = [];

  try {
    const types: ComponentType[] = ['agent', 'tool', 'workflow', 'template'];

    for (const type of types) {
      const listMethod = options.global
        ? Registry.localResolver.listGlobal.bind(Registry.localResolver)
        : Registry.localResolver.listProject.bind(Registry.localResolver);

      const comps = await listMethod(type);
      components.push(...comps);
    }
  } catch (error) {
    throw new Error(`Failed to list components: ${(error as Error).message}`);
  }

  if (components.length === 0) {
    console.log(chalk.yellow('No components installed'));
    process.exit(0);
  }

  // Filter components if name provided
  if (pluginName) {
    components = components.filter((c) => c.name === pluginName || c.plugin === pluginName);

    if (components.length === 0) {
      console.log(chalk.yellow(`Plugin '${pluginName}' not found`));
      process.exit(0);
    }
  }

  // Check for updates
  // @ts-expect-error - LocalComponent type mismatch with SDK
  const updateInfos = await checkAllComponentUpdates(components);
  const suggestions = getUpdateSuggestions(updateInfos, {
    majorOnly: options.major,
  });

  // Display results
  if (suggestions.length === 0) {
    console.log(chalk.green('✓ All components are up to date'));
    process.exit(0);
  }

  // Show available updates table
  console.log(chalk.bold.cyan('Available Updates'));
  console.log(chalk.dim('─'.repeat(80)));
  console.log();

  const table = new Table({
    head: ['Component', 'Current', 'Latest', 'Type'].map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
    },
  });

  for (const info of suggestions) {
    table.push([
      info.name,
      chalk.yellow(info.current),
      chalk.green(info.latest),
      getUpdateTypeLabel(info.updateType),
    ]);
  }

  console.log(table.toString());
  console.log();

  // Show summary
  console.log(chalk.dim(`${suggestions.length} update(s) available`));
  console.log();

  // In dry-run mode, show what would be done
  if (options.dryRun) {
    console.log(chalk.dim('(Dry run - no changes will be made)'));
    process.exit(0);
  }

  // In non-interactive mode, show what will be done
  if (options.verbose) {
    console.log(chalk.cyan('Installing updates...'));
    console.log();
  }

  // Install updates
  let installCount = 0;
  let failureCount = 0;

  for (const info of suggestions) {
    try {
      const component = components.find((c) => c.name === info.name);
      if (!component) continue;

      if (options.verbose) {
        console.log(`Updating ${info.name} from ${info.current} to ${info.latest}...`);
      }

      // Install updated version
      const installOptions = {
        scope: options.global ? ('global' as const) : ('local' as const),
        force: true,
        agentsOnly: component.type === 'agent',
        toolsOnly: component.type === 'tool',
        workflowsOnly: component.type === 'workflow',
        templatesOnly: component.type === 'template',
      };

      const result = await Registry.installer.installPlugin(
        `${info.name}@${info.latest}`,
        installOptions
      );

      if (result.success) {
        installCount++;
      } else {
        failureCount++;
        if (options.verbose) {
          formatWarning(`Failed to update ${info.name}: ${result.error}`);
        }
      }
    } catch (error) {
      failureCount++;
      if (options.verbose) {
        formatWarning(`Error updating ${info.name}: ${(error as Error).message}`);
      }
    }
  }

  // Update lockfile if requested
  if (options.save && installCount > 0) {
    try {
      const lockfilePath = await getLocalLockfilePath();
      let lockfile = await loadLockfile(lockfilePath);

      if (!lockfile) {
        console.log(chalk.dim('Lockfile not found, skipping update'));
      } else {
        // Reload components to get updated versions
        const updatedComponents = [];
        const types: ComponentType[] = ['agent', 'tool', 'workflow', 'template'];

        for (const type of types) {
          const listMethod = options.global
            ? Registry.localResolver.listGlobal.bind(Registry.localResolver)
            : Registry.localResolver.listProject.bind(Registry.localResolver);

          const comps = await listMethod(type);
          updatedComponents.push(...comps);
        }

        // Update lockfile
        for (const comp of updatedComponents) {
          // @ts-expect-error - LocalComponent type mismatch with SDK
          lockfile = mergeLockEntry(lockfile, comp);
        }

        await saveLockfile(lockfile, lockfilePath);
      }
    } catch (error) {
      formatWarning(`Could not update lockfile: ${(error as Error).message}`);
    }
  }

  // Show results
  console.log();
  if (failureCount === 0) {
    formatSuccess(`Updated ${installCount} component(s)`);
  } else {
    formatWarning(
      `Updated ${installCount} component(s), ${failureCount} failed`
    );
  }

  process.exit(0);
}

/**
 * Get display label for update type
 */
function getUpdateTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    major: chalk.red('Major'),
    minor: chalk.yellow('Minor'),
    patch: chalk.green('Patch'),
    none: chalk.dim('None'),
  };
  return labels[type] || type;
}

/**
 * Handle update command errors
 */
function handleUpdateError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('network') || err.message.includes('ENOTFOUND')) {
    hints.push('Network error - check internet connection');
    hints.push('Verify registry URLs are accessible');
  } else if (err.message.includes('no components')) {
    hints.push('No components installed');
    hints.push('Install a plugin first: fractary-forge install <plugin>');
  } else if (err.message.includes('not found')) {
    hints.push('Plugin not found');
    hints.push('Check plugin name spelling');
    hints.push('List installed: fractary-forge list');
  }

  formatError(err, 'Update failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createUpdateCommand;
