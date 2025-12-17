/**
 * Tool List Command
 *
 * List available tools
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../../client/get-client.js';
import { formatToolList } from '../../utils/output-formatter.js';

export function toolListCommand(): Command {
  const cmd = new Command('tool-list');

  cmd
    .description('List available tools')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .option('--json', 'Output as JSON')
    .action(async (options: any) => {
      try {
        const client = await getClient();

        // Parse tags if provided
        const filters: { tags?: string[] } = {};
        if (options.tags) {
          filters.tags = options.tags.split(',').map((t: string) => t.trim());
        }

        const tools = await client.toolList(filters);

        if (options.json) {
          console.log(JSON.stringify(tools, null, 2));
        } else {
          console.log(formatToolList(tools));
        }

      } catch (error) {
        console.error(chalk.red('Error:'), (error as Error).message);

        if ((error as Error).message.includes('configuration')) {
          console.log(chalk.dim('\nRun "fractary-forge init" to create a configuration.'));
        }

        process.exit(1);
      }
    });

  return cmd;
}
