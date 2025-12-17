/**
 * Forge Search Command
 *
 * Search for plugins and components in remote registries (Stockyard).
 * Supports filtering by type, pagination, and JSON output.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { ComponentType } from '@fractary/forge';
import { loadForgeConfig } from '../../utils/forge-config.js';
import { formatSearchResults, formatError } from '../../utils/formatters.js';

interface SearchCommandOptions {
  type?: ComponentType;
  page?: number;
  limit?: number;
  json?: boolean;
  verbose?: boolean;
}

interface SearchResult {
  name: string;
  type: string;
  version: string;
  description: string;
  author?: string;
  downloads?: number;
}

/**
 * Create search command
 */
export function createSearchCommand(): Command {
  const cmd = new Command('search');

  cmd
    .description('Search for plugins in remote registries')
    .argument('<query>', 'Search query')
    .option('-t, --type <type>', 'Filter by component type (agents, tools, workflows, templates)')
    .option('-p, --page <number>', 'Page number (default: 1)', '1')
    .option('-l, --limit <number>', 'Results per page (default: 20)', '20')
    .option('--json', 'Output as JSON')
    .option('-v, --verbose', 'Show detailed search information')
    .action(async (query: string, options: SearchCommandOptions) => {
      try {
        await searchCommand(query, options);
      } catch (error) {
        handleSearchError(error, query);
      }
    });

  return cmd;
}

/**
 * Search command implementation
 */
async function searchCommand(query: string, options: SearchCommandOptions): Promise<void> {
  // Load configuration
  const { config, configSource } = await loadForgeConfig();

  if (options.verbose && !options.json) {
    console.log(chalk.dim(`Using ${configSource} configuration`));
    console.log(chalk.dim(`Searching registries: ${config.registries.map((r) => r.name).join(', ')}`));
    console.log();
  }

  // Validate component type if provided
  if (options.type) {
    validateComponentType(options.type);
  }

  // Parse pagination options
  const page = typeof options.page === 'string' ? parseInt(options.page, 10) : (options.page || 1);
  const limit = typeof options.limit === 'string' ? parseInt(options.limit, 10) : (options.limit || 20);

  if (page < 1 || limit < 1) {
    console.error(chalk.red('✗ Page and limit must be positive numbers'));
    process.exit(1);
  }

  // Perform search
  const results = await performSearch(query, {
    type: options.type,
    page,
    limit,
    registries: config.registries,
  });

  // Output results
  if (options.json) {
    outputJson(results);
  } else {
    formatSearchResults(results.results, {
      total: results.total,
      page: results.page,
      limit: results.limit,
    });
  }

  process.exit(0);
}

/**
 * Perform search across configured registries
 */
async function performSearch(
  query: string,
  options: {
    type?: ComponentType;
    page: number;
    limit: number;
    registries: any[];
  }
): Promise<{
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
}> {
  // TODO: Implement actual registry search in Phase 6
  // This will require:
  // 1. Call each configured registry's search endpoint
  // 2. Merge and deduplicate results
  // 3. Apply pagination
  // 4. Return sorted results

  // For Phase 1, we'll implement a simple manifest-based search
  // using the existing Registry SDK capabilities

  try {
    // Use manifest resolver to search
    const allResults: SearchResult[] = [];

    for (const registry of options.registries) {
      if (!registry.enabled) continue;

      try {
        // Fetch manifest from registry
        const manifest = await fetchManifest(registry.url);

        // Search manifest for matching entries
        const matches = searchManifest(manifest, query, options.type);
        allResults.push(...matches);
      } catch (error) {
        // Continue with other registries if one fails
        console.warn(chalk.dim(`Warning: Failed to search ${registry.name}: ${(error as Error).message}`));
      }
    }

    // Deduplicate by name (prefer higher version)
    const deduplicated = deduplicateResults(allResults);

    // Apply pagination
    const total = deduplicated.length;
    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;
    const paginated = deduplicated.slice(startIndex, endIndex);

    return {
      results: paginated,
      total,
      page: options.page,
      limit: options.limit,
    };
  } catch (error) {
    throw new Error(`Search failed: ${(error as Error).message}`);
  }
}

/**
 * Fetch manifest from registry URL
 */
async function fetchManifest(url: string): Promise<any> {
  // Use built-in fetch (Node 18+)
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search manifest for matching entries
 */
function searchManifest(
  manifest: any,
  query: string,
  type?: ComponentType
): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  // Search through plugins
  if (manifest.plugins) {
    for (const plugin of manifest.plugins) {
      // Check if plugin name or description matches
      const nameMatches = plugin.name.toLowerCase().includes(queryLower);
      const descMatches = plugin.description?.toLowerCase().includes(queryLower);

      if (nameMatches || descMatches) {
        // If type filter is specified, check components
        if (type) {
          const hasMatchingType = plugin.components?.[type]?.length > 0;
          if (!hasMatchingType) continue;
        }

        results.push({
          name: plugin.name,
          type: 'plugin',
          version: plugin.version || 'unknown',
          description: plugin.description || 'No description',
          author: plugin.author,
          downloads: plugin.downloads,
        });
      }
    }
  }

  return results;
}

/**
 * Deduplicate results, preferring higher versions
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const map = new Map<string, SearchResult>();

  for (const result of results) {
    const existing = map.get(result.name);

    if (!existing) {
      map.set(result.name, result);
    } else {
      // Compare versions and keep the higher one
      // For simplicity, just keep the first one for now
      // TODO: Use semver comparison in Phase 2
    }
  }

  return Array.from(map.values());
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
 * Output search results as JSON
 */
function outputJson(data: {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
}): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Handle search errors
 */
function handleSearchError(error: unknown, query: string): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('network') || err.message.includes('ENOTFOUND')) {
    hints.push('Network error - check internet connection');
    hints.push('Verify registry URLs are accessible');
    hints.push('Check firewall/proxy settings');
  } else if (err.message.includes('HTTP 404')) {
    hints.push('Registry manifest not found');
    hints.push('Verify registry URL in configuration');
    hints.push('Run: fractary-forge registry list');
  } else if (err.message.includes('HTTP 401') || err.message.includes('HTTP 403')) {
    hints.push('Authentication required or forbidden');
    hints.push('Check if registry requires authentication');
  } else if (err.message.includes('timeout')) {
    hints.push('Request timed out');
    hints.push('Try again later');
    hints.push('Check network connection');
  } else {
    hints.push(`Could not search for: ${query}`);
    hints.push('Try a different search query');
    hints.push('Check registry configuration: fractary-forge registry list');
  }

  formatError(err, 'Search failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createSearchCommand;
