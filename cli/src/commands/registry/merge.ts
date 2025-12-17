/**
 * Forge Merge Command
 *
 * Merge components from different sources with conflict resolution.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { mergeComponents, MergeOptions, MergeResult } from '../../utils/merge-manager.js';
import { formatSuccess, formatWarning, formatError } from '../../utils/formatters.js';

interface MergeCommandOptions {
  strategy?: 'auto' | 'local' | 'upstream' | 'manual';
  backup?: boolean;
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
}

/**
 * Create merge command
 */
export function createMergeCommand(): Command {
  const cmd = new Command('merge');

  cmd
    .description('Merge components from different sources')
    .argument('<base>', 'Base component to merge into')
    .argument('<source>', 'Source component to merge from')
    .option('-s, --strategy <type>', 'Merge strategy: auto, local, upstream, manual (default: auto)', 'auto')
    .option('-b, --backup', 'Create backup before merging')
    .option('--dry-run', 'Show what would be merged without applying')
    .option('-f, --force', 'Skip validation')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (base: string, source: string, options: MergeCommandOptions) => {
      try {
        await mergeCommand(base, source, options);
      } catch (error) {
        handleMergeError(error);
      }
    });

  return cmd;
}

/**
 * Merge command implementation
 */
async function mergeCommand(
  base: string,
  source: string,
  options: MergeCommandOptions
): Promise<void> {
  // Validate strategy
  const validStrategies = ['auto', 'local', 'upstream', 'manual'];
  if (!validStrategies.includes(options.strategy || 'auto')) {
    console.error(chalk.red('✗ Invalid merge strategy'));
    console.error();
    console.error(chalk.yellow('Valid strategies:'));
    console.error(chalk.yellow('  • auto: Most recent version wins'));
    console.error(chalk.yellow('  • local: Keep local component unchanged'));
    console.error(chalk.yellow('  • upstream: Use upstream version completely'));
    console.error(chalk.yellow('  • manual: Interactive conflict resolution'));
    process.exit(1);
  }

  const strategy = (options.strategy || 'auto') as 'auto' | 'local' | 'upstream' | 'manual';

  if (options.verbose) {
    console.log(chalk.dim(`Base Component: ${base}`));
    console.log(chalk.dim(`Source Component: ${source}`));
    console.log(chalk.dim(`Strategy: ${strategy}`));
    console.log(chalk.dim(`Backup: ${options.backup ? 'enabled' : 'disabled'}`));
    if (options.dryRun) {
      console.log(chalk.dim('Mode: DRY RUN'));
    }
    console.log();
  }

  // Display strategy information
  console.log();
  console.log(chalk.bold('Merge Configuration:'));
  console.log();
  console.log(`  Base:     ${chalk.cyan(base)}`);
  console.log(`  Source:   ${chalk.cyan(source)}`);
  console.log(`  Strategy: ${chalk.cyan(strategy)}`);
  console.log();

  // Display strategy explanation
  console.log(chalk.bold('Merge Strategy Details:'));
  console.log();

  switch (strategy) {
    case 'auto':
      console.log(chalk.dim('  Auto merge: Most recently updated version will be used'));
      console.log(chalk.dim('  Decision based on component timestamps'));
      break;
    case 'local':
      console.log(chalk.dim('  Local merge: Current component will be preserved'));
      console.log(chalk.dim('  No changes will be applied to the base component'));
      break;
    case 'upstream':
      console.log(chalk.dim('  Upstream merge: Source component will replace base'));
      console.log(chalk.dim('  All local modifications will be overwritten'));
      break;
    case 'manual':
      console.log(chalk.dim('  Manual merge: Interactive conflict resolution'));
      console.log(chalk.dim('  You will be prompted for each conflict'));
      break;
  }

  console.log();

  if (options.dryRun) {
    console.log(chalk.cyan('(DRY RUN - no changes will be made)'));
    console.log();
  }

  // For now, show planned merge behavior
  console.log(chalk.bold('Planned Changes:'));
  console.log();

  const table = new Table({
    head: ['Aspect', 'Action'],
    colWidths: [20, 50],
    style: { head: [], border: ['grey'] },
  });

  table.push(['Metadata', 'Will be compared and merged']);
  table.push(['Files', 'Will be compared for differences']);
  table.push(['Conflicts', 'Handled by ' + strategy + ' strategy']);
  table.push(['Backup', options.backup ? chalk.green('Created') : chalk.yellow('Not created')]);

  console.log(table.toString());
  console.log();

  // Display what would happen
  formatSuccess(`Merge ready for execution`);
  console.log();

  if (!options.dryRun) {
    console.log(chalk.dim('Use --dry-run to preview changes without applying'));
  }

  console.log(chalk.dim('Full merge functionality will be available in a future release'));
  console.log();

  process.exit(0);
}

/**
 * Handle merge command errors
 */
function handleMergeError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('not found')) {
    hints.push('Component not found');
    hints.push('Check component names and locations');
  } else if (err.message.includes('conflict')) {
    hints.push('Merge conflicts detected');
    hints.push('Use --strategy manual for interactive resolution');
  } else if (err.message.includes('permission')) {
    hints.push('Permission denied');
    hints.push('Check file/directory permissions');
  }

  formatError(err, 'Merge failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createMergeCommand;
