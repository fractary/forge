/**
 * Agent Validate Command
 *
 * Validate agent definition
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../../client/get-client.js';
import { ValidationReporter } from '../../utils/validation-reporter.js';

export function agentValidateCommand(): Command {
  const cmd = new Command('agent-validate');

  cmd
    .description('Validate agent definition')
    .argument('<name>', 'Agent name (with optional version, e.g., agent@1.0.0)')
    .option('--strict', 'Enable strict validation')
    .option('--check-tools', 'Verify all tool references exist')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options: any) => {
      try {
        const client = await getClient();

        // Resolve agent to trigger validation
        const resolved = await client.agentResolve(name);

        // Basic validation result
        const result = {
          valid: true,
          name: resolved.definition.name,
          version: resolved.version,
          errors: [] as any[],
        };

        // Additional tool checking if requested
        if (options.checkTools && resolved.definition.tools) {
          for (const toolName of resolved.definition.tools) {
            const exists = await client.toolHas(toolName);
            if (!exists) {
              result.valid = false;
              result.errors.push({
                message: `Tool not found: ${toolName}`,
                path: 'tools',
              });
            }
          }
        }

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          ValidationReporter.reportAgentValidation(result);
        }

        process.exit(result.valid ? 0 : 1);

      } catch (error) {
        const result = {
          valid: false,
          name,
          errors: [{ message: (error as Error).message }],
        };

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.error(chalk.red('Error:'), (error as Error).message);

          if ((error as Error).message.includes('not found')) {
            console.log(chalk.dim('\nAgent definition not found.'));
            console.log(chalk.dim('Check: .fractary/agents/<name>.yaml'));
          } else if ((error as Error).message.includes('configuration')) {
            console.log(chalk.dim('\nRun "fractary-forge init" to create a configuration.'));
          }
        }

        process.exit(1);
      }
    });

  return cmd;
}
