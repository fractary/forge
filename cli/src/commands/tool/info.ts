/**
 * Tool Info Command
 *
 * Display information about a tool
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../../client/get-client.js';
import { formatToolInfo } from '../../utils/output-formatter.js';

export function toolInfoCommand(): Command {
  const cmd = new Command('tool-info');

  cmd
    .description('Show tool information')
    .argument('<name>', 'Tool name (with optional version, e.g., tool@1.0.0)')
    .option('--json', 'Output as JSON')
    .option('--show-schema', 'Show detailed input schema')
    .action(async (name: string, options: any) => {
      try {
        const client = await getClient();
        const info = await client.toolInfoGet(name);

        if (options.json) {
          console.log(JSON.stringify(info, null, 2));
        } else {
          console.log(formatToolInfo(info, {
            showSchema: options.showSchema,
          }));
        }

      } catch (error) {
        console.error(chalk.red('Error:'), (error as Error).message);

        if ((error as Error).message.includes('not found')) {
          console.log(chalk.dim('\nTool not found in any registry.'));
          console.log(chalk.dim('Available registries: local, global, stockyard'));
          console.log(chalk.dim('Run "fractary-forge tool-list" to see available tools.'));
        } else if ((error as Error).message.includes('configuration')) {
          console.log(chalk.dim('\nRun "fractary-forge init" to create a configuration.'));
        }

        process.exit(1);
      }
    });

  return cmd;
}
