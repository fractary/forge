/**
 * Output Formatting Utilities
 *
 * Consistent formatting for Forge CLI output including tables,
 * success/error messages, and component information display.
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import type { InstallResult } from '@fractary/forge';

/**
 * Format installation result
 */
export function formatInstallResult(result: InstallResult, options: { verbose?: boolean } = {}): void {
  if (!result.success) {
    console.error(chalk.red(`✗ Installation failed: ${result.error}`));
    return;
  }

  // Success header
  console.log(chalk.green(`✓ Installed ${result.name}`));

  // Component counts
  const counts: string[] = [];
  if (result.installed.agents) counts.push(`${result.installed.agents} agent(s)`);
  if (result.installed.tools) counts.push(`${result.installed.tools} tool(s)`);
  if (result.installed.workflows) counts.push(`${result.installed.workflows} workflow(s)`);
  if (result.installed.templates) counts.push(`${result.installed.templates} template(s)`);
  if (result.installed.hooks) counts.push(`${result.installed.hooks} hook(s)`);
  if (result.installed.commands) counts.push(`${result.installed.commands} command(s)`);

  if (counts.length > 0) {
    counts.forEach((count) => console.log(`  • ${count}`));
  }

  // Installation path
  if (result.path) {
    console.log(`\\nInstalled to: ${chalk.cyan(result.path)}`);
  }

  // Size
  if (result.totalSize > 0) {
    console.log(`Total size: ${formatBytes(result.totalSize)}`);
  }

  // Warnings
  if (result.warnings && result.warnings.length > 0) {
    console.log();
    result.warnings.forEach((warning) => {
      console.warn(chalk.yellow(`⚠ ${warning}`));
    });
  }

  // Dry run notice
  if (result.dryRun) {
    console.log();
    console.log(chalk.dim('(Dry run - no files were actually installed)'));
  }
}

/**
 * Format component list as table
 */
export function formatComponentTable(
  components: Array<{
    name: string;
    type: string;
    version?: string;
    source: string;
    path?: string;
  }>,
  options: { showPath?: boolean } = {}
): void {
  if (components.length === 0) {
    console.log(chalk.dim('No components found.'));
    return;
  }

  const table = new Table({
    head: ['Name', 'Type', 'Version', 'Source', ...(options.showPath ? ['Path'] : [])].map((h) =>
      chalk.cyan(h)
    ),
    style: {
      head: [],
      border: [],
    },
  });

  components.forEach((comp) => {
    const row = [
      comp.name,
      comp.type,
      comp.version || '-',
      comp.source,
      ...(options.showPath ? [comp.path || '-'] : []),
    ];
    table.push(row);
  });

  console.log(table.toString());
  console.log();
  console.log(chalk.dim(`Total: ${components.length} component(s)`));
}

/**
 * Format component info (detailed view)
 */
export function formatComponentInfo(info: {
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
  console.log();
  console.log(chalk.bold.cyan(`${info.name}`));
  console.log(chalk.dim('─'.repeat(60)));

  // Basic info
  console.log(`Type: ${chalk.yellow(info.type)}`);
  if (info.version) {
    console.log(`Version: ${chalk.green(info.version)}`);
  }
  console.log(`Source: ${chalk.cyan(info.source)}`);

  // Location
  if (info.path) {
    console.log(`Path: ${chalk.dim(info.path)}`);
  }
  if (info.url) {
    console.log(`URL: ${chalk.dim(info.url)}`);
  }

  // Description
  if (info.description) {
    console.log();
    console.log(chalk.bold('Description:'));
    console.log(info.description);
  }

  // Dependencies
  if (info.dependencies && info.dependencies.length > 0) {
    console.log();
    console.log(chalk.bold('Dependencies:'));
    info.dependencies.forEach((dep) => {
      console.log(`  • ${dep}`);
    });
  }

  // Available versions
  if (info.availableVersions && info.availableVersions.length > 0) {
    console.log();
    console.log(chalk.bold('Available Versions:'));
    info.availableVersions.forEach((version) => {
      console.log(`  • ${version}`);
    });
  }

  console.log();
}

/**
 * Format error with contextual help
 */
export function formatError(error: Error, context: string, hints?: string[]): void {
  console.error();
  console.error(chalk.red(`✗ ${context}: ${error.message}`));

  // Show hints if provided
  if (hints && hints.length > 0) {
    console.error();
    console.error(chalk.yellow('Try:'));
    hints.forEach((hint) => {
      console.error(chalk.yellow(`  • ${hint}`));
    });
  }

  // Show stack trace in debug mode
  if (process.env.DEBUG) {
    console.error();
    console.error(chalk.dim('Stack trace:'));
    console.error(chalk.dim(error.stack));
  }

  console.error();
}

/**
 * Format success message
 */
export function formatSuccess(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

/**
 * Format warning message
 */
export function formatWarning(message: string): void {
  console.warn(chalk.yellow(`⚠ ${message}`));
}

/**
 * Format info message
 */
export function formatInfo(message: string): void {
  console.log(chalk.cyan(`ℹ ${message}`));
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format search results table
 */
export function formatSearchResults(
  results: Array<{
    name: string;
    type: string;
    version: string;
    description: string;
    author?: string;
    downloads?: number;
  }>,
  pagination: {
    total: number;
    page: number;
    limit: number;
  }
): void {
  if (results.length === 0) {
    console.log(chalk.dim('No results found.'));
    return;
  }

  const table = new Table({
    head: ['Name', 'Type', 'Version', 'Description', 'Author', 'Downloads'].map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
    },
    colWidths: [25, 12, 10, 40, 15, 12],
  });

  results.forEach((result) => {
    table.push([
      result.name,
      result.type,
      result.version,
      result.description.substring(0, 37) + (result.description.length > 37 ? '...' : ''),
      result.author || '-',
      result.downloads?.toLocaleString() || '-',
    ]);
  });

  console.log(table.toString());
  console.log();

  const startIndex = (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);
  console.log(
    chalk.dim(
      `Showing ${startIndex}-${endIndex} of ${pagination.total} results. Page ${pagination.page}`
    )
  );

  if (endIndex < pagination.total) {
    console.log(chalk.dim(`Use --page ${pagination.page + 1} for next page.`));
  }
}

/**
 * Format cache statistics
 */
export function formatCacheStats(stats: {
  totalEntries: number;
  freshEntries: number;
  staleEntries: number;
  totalSize: number;
  oldestEntry?: number;
  newestEntry?: number;
}): void {
  console.log();
  console.log(chalk.bold.cyan('Cache Statistics'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(`Total entries: ${chalk.yellow(stats.totalEntries.toString())}`);
  console.log(`Fresh entries: ${chalk.green(stats.freshEntries.toString())}`);
  console.log(`Stale entries: ${chalk.red(stats.staleEntries.toString())}`);
  console.log(`Total size: ${chalk.cyan(formatBytes(stats.totalSize))}`);

  if (stats.oldestEntry) {
    console.log(`Oldest entry: ${chalk.dim(new Date(stats.oldestEntry).toLocaleString())}`);
  }
  if (stats.newestEntry) {
    console.log(`Newest entry: ${chalk.dim(new Date(stats.newestEntry).toLocaleString())}`);
  }
  console.log();
}

/**
 * Create a progress message (for use with ora)
 */
export function createProgressMessage(action: string, target: string): string {
  return chalk.cyan(`${action} ${chalk.bold(target)}...`);
}
