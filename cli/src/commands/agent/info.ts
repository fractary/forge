/**
 * Agent Info Command
 *
 * Display information about an agent
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../../client/get-client.js';
import { formatAgentInfo } from '../../utils/output-formatter.js';

export function agentInfoCommand(): Command {
  const cmd = new Command('agent-info');

  cmd
    .description('Show agent information')
    .argument('<name>', 'Agent name (with optional version, e.g., agent@1.0.0)')
    .option('--json', 'Output as JSON')
    .option('--show-tools', 'Show detailed tool information')
    .option('--show-prompt', 'Include full system prompt')
    .action(async (name: string, options: any) => {
      try {
        const client = await getClient();
        const info = await client.getAgentInfo(name);

        if (options.json) {
          console.log(JSON.stringify(info, null, 2));
        } else {
          console.log(formatAgentInfo(info, {
            showTools: options.showTools,
            showPrompt: options.showPrompt,
          }));
        }

      } catch (error) {
        console.error(chalk.red('Error:'), (error as Error).message);

        if ((error as Error).message.includes('not found')) {
          console.log(chalk.dim('\nAgent not found in any registry.'));
          console.log(chalk.dim('Available registries: local, global, stockyard'));
          console.log(chalk.dim('Run "fractary-forge agent-list" to see available agents.'));
        } else if ((error as Error).message.includes('configuration')) {
          console.log(chalk.dim('\nRun "fractary-forge init" to create a configuration.'));
        }

        process.exit(1);
      }
    });

  return cmd;
}
