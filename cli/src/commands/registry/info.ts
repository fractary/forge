/**
 * Forge Info Command
 *
 * Show detailed information about a plugin or component.
 * Supports both installed and remote packages with version listing.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '@fractary/forge';
import type { ComponentType } from '@fractary/forge';
import { loadForgeConfig } from '../../utils/forge-config.js';
import { formatComponentInfo, formatError } from '../../utils/formatters.js';

interface InfoCommandOptions {
  global?: boolean;
  local?: boolean;
  versions?: boolean;
  json?: boolean;
  type?: ComponentType;
  verbose?: boolean;
}

/**
 * Create info command
 */
export function createInfoCommand(): Command {
  const cmd = new Command('info');

  cmd
    .description('Show detailed information about a plugin or component')
    .argument('<name>', 'Plugin or component name')
    .option('-g, --global', 'Search only in global registry')
    .option('-l, --local', 'Search only in local registry')
    .option('-t, --type <type>', 'Component type (agents, tools, workflows, templates)')
    .option('--versions', 'Show all available versions from registries')
    .option('--json', 'Output as JSON')
    .option('-v, --verbose', 'Show additional details')
    .action(async (name: string, options: InfoCommandOptions) => {
      try {
        await infoCommand(name, options);
      } catch (error) {
        handleInfoError(error, name);
      }
    });

  return cmd;
}

/**
 * Info command implementation
 */
async function infoCommand(name: string, options: InfoCommandOptions): Promise<void> {
  // Load configuration
  const { config, configSource } = await loadForgeConfig();

  if (options.verbose && !options.json) {
    console.log(chalk.dim(`Using ${configSource} configuration`));
    console.log();
  }

  // Validate component type if provided
  if (options.type) {
    validateComponentType(options.type);
  }

  // Try to resolve the component
  const componentInfo = await resolveComponent(name, options);

  if (!componentInfo) {
    console.error(chalk.red(`✗ Component '${name}' not found`));
    console.error();
    console.error(chalk.yellow('Try:'));
    console.error(chalk.yellow(`  • Check spelling: ${name}`));
    console.error(chalk.yellow('  • List installed: fractary-forge list'));
    console.error(chalk.yellow(`  • Search remote: fractary-forge search ${name}`));
    process.exit(1);
  }

  // Fetch available versions if requested
  let availableVersions: string[] | undefined;
  if (options.versions) {
    availableVersions = await fetchAvailableVersions(name, config);
  }

  // Output results
  if (options.json) {
    outputJson({ ...componentInfo, availableVersions });
  } else {
    formatComponentInfo({ ...componentInfo, availableVersions });
  }

  process.exit(0);
}

/**
 * Resolve component from local or remote sources
 */
async function resolveComponent(
  name: string,
  options: InfoCommandOptions
): Promise<{
  name: string;
  type: string;
  version?: string;
  source: string;
  path?: string;
  url?: string;
  description?: string;
  dependencies?: string[];
} | null> {
  // Determine search scope
  const scopes = determineScopes(options);

  // First, try to find in local/global registries
  for (const scope of scopes) {
    try {
      // Use appropriate list method based on scope
      const listMethod = scope === 'local'
        ? Registry.localResolver.listProject.bind(Registry.localResolver)
        : Registry.localResolver.listGlobal.bind(Registry.localResolver);

      const components = options.type
        ? await listMethod(options.type)
        : await Registry.localResolver.listAll(options.type || 'agent');

      // Find matching component
      const component = components.find(
        (c) => c.name === name || c.plugin === name
      );

      if (component) {
        return {
          name: component.name,
          type: component.type,
          // @ts-expect-error - version may not exist on LocalComponent in current SDK
          version: component.version,
          source: scope === 'global' ? 'global registry' : 'local registry',
          path: component.path,
          description: undefined, // TODO: Load from manifest if available
          dependencies: undefined, // TODO: Load from manifest if available
        };
      }
    } catch (error) {
      // Continue to next scope
      if (options.verbose && !options.json) {
        console.warn(chalk.dim(`Could not search ${scope}: ${(error as Error).message}`));
      }
    }
  }

  // If not found locally, try to resolve from remote registries
  if (!options.local) {
    try {
      const resolved = await Registry.resolver.resolve(
        name,
        options.type || 'agent', // Default to agent if no type specified
        { remoteOnly: true }
      );

      if (resolved) {
        return {
          name: resolved.name,
          type: resolved.type,
          version: resolved.version,
          source: resolved.source === 'local' || resolved.source === 'global'
            ? resolved.source
            : `registry: ${resolved.source}`,
          url: resolved.url,
          description: undefined, // TODO: Load from manifest
          dependencies: undefined, // TODO: Load from manifest
        };
      }
    } catch (error) {
      // Remote resolution failed, continue
      if (options.verbose && !options.json) {
        console.warn(chalk.dim(`Remote resolution failed: ${(error as Error).message}`));
      }
    }
  }

  return null;
}

/**
 * Fetch available versions from registries
 */
async function fetchAvailableVersions(name: string, config: any): Promise<string[]> {
  // TODO: Implement version fetching in Phase 2
  // This will require:
  // 1. Query all configured registries
  // 2. Collect all available versions
  // 3. Sort by semver
  // 4. Return list

  // For now, return placeholder
  return [];
}

/**
 * Determine which scopes to search based on options
 */
function determineScopes(options: InfoCommandOptions): Array<'local' | 'global'> {
  // If both specified or neither specified, search both
  if ((options.global && options.local) || (!options.global && !options.local)) {
    return ['local', 'global'];
  }

  // Otherwise, search only the specified scope
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
 * Output component info as JSON
 */
function outputJson(info: {
  name: string;
  type: string;
  version?: string;
  source: string;
  path?: string;
  url?: string;
  description?: string;
  dependencies?: string[];
  availableVersions?: string[];
}): void {
  console.log(JSON.stringify(info, null, 2));
}

/**
 * Handle info errors
 */
function handleInfoError(error: unknown, name: string): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('not found')) {
    hints.push(`Component '${name}' not found`);
    hints.push(`Search for it: fractary-forge search ${name}`);
    hints.push('List installed: fractary-forge list');
  } else if (err.message.includes('permission') || err.message.includes('EACCES')) {
    hints.push('Permission denied');
    hints.push('Check file permissions');
  } else if (err.message.includes('network') || err.message.includes('ENOTFOUND')) {
    hints.push('Network error - check internet connection');
    hints.push('Try --local to search only installed components');
  }

  formatError(err, 'Info command failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createInfoCommand;
