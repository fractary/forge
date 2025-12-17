/**
 * Agent List Command
 *
 * List available agents
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../../client/get-client.js';
import { formatAgentList } from '../../utils/output-formatter.js';

export function agentListCommand(): Command {
  const cmd = new Command('agent-list');

  cmd
    .description('List available agents')
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

        const agents = await client.agentList(filters);

        if (options.json) {
          console.log(JSON.stringify(agents, null, 2));
        } else {
          console.log(formatAgentList(agents));
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
