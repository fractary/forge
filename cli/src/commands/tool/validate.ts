/**
 * Tool Validate Command
 *
 * Validate tool definition
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../../client/get-client.js';
import { ValidationReporter } from '../../utils/validation-reporter.js';

export function toolValidateCommand(): Command {
  const cmd = new Command('tool-validate');

  cmd
    .description('Validate tool definition')
    .argument('<name>', 'Tool name (with optional version, e.g., tool@1.0.0)')
    .option('--strict', 'Enable strict validation')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options: any) => {
      try {
        const client = await getClient();

        // Resolve tool to trigger validation
        const resolved = await client.toolResolve(name);

        // Basic validation result
        const result = {
          valid: true,
          name: resolved.definition.name,
          version: resolved.version,
          errors: [] as any[],
        };

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          ValidationReporter.reportToolValidation(result);
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
            console.log(chalk.dim('\nTool definition not found.'));
            console.log(chalk.dim('Check: .fractary/tools/<name>.yaml'));
          } else if ((error as Error).message.includes('configuration')) {
            console.log(chalk.dim('\nRun "fractary-forge init" to create a configuration.'));
          }
        }

        process.exit(1);
      }
    });

  return cmd;
}
