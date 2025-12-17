/**
 * Forge List Command
 *
 * List installed plugins and components from local and global registries.
 * Supports filtering by type, scope, and JSON output.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '@fractary/forge';

type ComponentType = 'agent' | 'tool' | 'workflow' | 'template' | 'plugin';

interface LocalComponent {
  name: string;
  type: ComponentType;
  version?: string;
  source: string;
  path?: string;
  plugin?: string;
  isProject?: boolean;
}
import { loadForgeConfig } from '../../utils/forge-config.js';
import { formatComponentTable, formatWarning } from '../../utils/formatters.js';

interface ListCommandOptions {
  global?: boolean;
  local?: boolean;
  type?: ComponentType;
  json?: boolean;
  updates?: boolean;
  verbose?: boolean;
}

/**
 * Create list command
 */
export function createListCommand(): Command {
  const cmd = new Command('list');

  cmd
    .description('List installed plugins and components')
    .option('-g, --global', 'List globally installed components')
    .option('-l, --local', 'List locally installed components')
    .option('-t, --type <type>', 'Filter by component type (agents, tools, workflows, templates)')
    .option('--json', 'Output as JSON')
    .option('--updates', 'Check for available updates (requires network)')
    .option('-v, --verbose', 'Show detailed information including paths')
    .action(async (options: ListCommandOptions) => {
      try {
        await listCommand(options);
      } catch (error) {
        handleListError(error);
      }
    });

  return cmd;
}

/**
 * List command implementation
 */
async function listCommand(options: ListCommandOptions): Promise<void> {
  // Load configuration
  const { config, configSource } = await loadForgeConfig();

  if (options.verbose && !options.json) {
    console.log(chalk.dim(`Using ${configSource} configuration`));
    console.log();
  }

  // Determine scope to list
  const scopes = determineScopes(options);

  // Validate component type if provided
  if (options.type) {
    validateComponentType(options.type);
  }

  // Collect components from all scopes
  const allComponents: Array<LocalComponent & { scope: 'local' | 'global' }> = [];

  for (const scope of scopes) {
    try {
      // Use appropriate list method based on scope
      const listMethod = scope === 'local'
        ? Registry.localResolver.listProject.bind(Registry.localResolver)
        : Registry.localResolver.listGlobal.bind(Registry.localResolver);

      const components = options.type
        ? await listMethod(options.type)
        : await Registry.localResolver.listAll(options.type || 'agent');

      // Add scope to each component
      components.forEach((comp) => {
        // @ts-expect-error - LocalComponent type mismatch with SDK
        allComponents.push({
          ...comp,
          scope,
        });
      });
    } catch (error) {
      if (options.verbose && !options.json) {
        formatWarning(`Failed to list ${scope} components: ${(error as Error).message}`);
      }
    }
  }

  // Check for updates if requested
  if (options.updates) {
    await checkForUpdates(allComponents);
  }

  // Output results
  if (options.json) {
    outputJson(allComponents);
  } else {
    outputTable(allComponents, {
      showPath: options.verbose,
      showUpdates: options.updates,
    });
  }

  process.exit(0);
}

/**
 * Determine which scopes to list based on options
 */
function determineScopes(options: ListCommandOptions): Array<'local' | 'global'> {
  // If both specified or neither specified, list both
  if ((options.global && options.local) || (!options.global && !options.local)) {
    return ['local', 'global'];
  }

  // Otherwise, list only the specified scope
  if (options.global) {
    return ['global'];
  }

  return ['local'];
}

/**
 * Validate component type
 */
function validateComponentType(type: string): asserts type is ComponentType {
  const validTypes: ComponentType[] = ['agent', 'tool', 'workflow', 'template', 'plugin'];

  if (!validTypes.includes(type as ComponentType)) {
    console.error(chalk.red(`✗ Invalid component type: ${type}`));
    console.error();
    console.error(chalk.yellow('Valid types:'));
    validTypes.forEach((t) => {
      console.error(chalk.yellow(`  • ${t}`));
    });
    process.exit(1);
  }
}

/**
 * Check for updates for components
 */
async function checkForUpdates(
  components: Array<LocalComponent & { scope: 'local' | 'global' }>
): Promise<void> {
  // TODO: Implement update checking in Phase 2
  // This will require:
  // 1. Fetching latest versions from registries
  // 2. Comparing with installed versions using semver
  // 3. Adding 'updateAvailable' field to components

  // For now, this is a placeholder
  // Will be implemented when UpdateChecker is added in Phase 2
}

/**
 * Output components as JSON
 */
function outputJson(components: Array<LocalComponent & { scope: 'local' | 'global' }>): void {
  const output = components.map((comp) => ({
    name: comp.name,
    type: comp.type,
    version: comp.version || null,
    source: comp.source,
    scope: comp.scope,
    path: comp.path || null,
    plugin: comp.plugin || null,
    isProject: comp.isProject || false,
  }));

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Output components as formatted table
 */
function outputTable(
  components: Array<LocalComponent & { scope: 'local' | 'global' }>,
  options: { showPath?: boolean; showUpdates?: boolean }
): void {
  if (components.length === 0) {
    console.log(chalk.dim('No components found.'));
    console.log();
    console.log(chalk.dim('Install a plugin with:'));
    console.log(chalk.cyan('  fractary-forge install <plugin-name>'));
    return;
  }

  // Group components by scope
  const localComponents = components.filter((c) => c.scope === 'local');
  const globalComponents = components.filter((c) => c.scope === 'global');

  // Display local components
  if (localComponents.length > 0) {
    console.log();
    console.log(chalk.bold.cyan('Local Components'));
    console.log(chalk.dim('─'.repeat(60)));

    formatComponentTable(
      localComponents.map((c) => ({
        name: c.name,
        type: c.type,
        version: c.version,
        source: c.plugin || c.source,
        path: c.path,
      })),
      { showPath: options.showPath }
    );
  }

  // Display global components
  if (globalComponents.length > 0) {
    console.log();
    console.log(chalk.bold.cyan('Global Components'));
    console.log(chalk.dim('─'.repeat(60)));

    formatComponentTable(
      globalComponents.map((c) => ({
        name: c.name,
        type: c.type,
        version: c.version,
        source: c.plugin || c.source,
        path: c.path,
      })),
      { showPath: options.showPath }
    );
  }

  // Show update notice if requested but not implemented
  if (options.showUpdates) {
    console.log();
    console.log(
      chalk.dim('Note: Update checking will be available in Phase 2 (forge update command)')
    );
  }
}

/**
 * Handle list errors
 */
function handleListError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('permission') || err.message.includes('EACCES')) {
    hints.push('Permission denied reading component directories');
    hints.push('Check file permissions');
  } else if (err.message.includes('not found') || err.message.includes('ENOENT')) {
    hints.push('Component directory not found');
    hints.push('Run: fractary-forge init');
  }

  console.error();
  console.error(chalk.red(`✗ List failed: ${err.message}`));

  if (hints.length > 0) {
    console.error();
    console.error(chalk.yellow('Try:'));
    hints.forEach((hint) => {
      console.error(chalk.yellow(`  • ${hint}`));
    });
  }

  if (process.env.DEBUG) {
    console.error();
    console.error(chalk.dim('Stack trace:'));
    console.error(chalk.dim(err.stack));
  }

  console.error();
  process.exit(1);
}

// Export for use in index
export default createListCommand;
