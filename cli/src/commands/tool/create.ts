/**
 * Tool Create Command
 *
 * Create a new tool definition
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getClient } from '../../client/get-client.js';

interface ToolCreateOptions {
  description?: string;
  command?: string;
  interactive?: boolean;
}

/**
 * Validate tool name format
 */
function validateToolName(name: string): boolean {
  // Must be lowercase with hyphens, no special characters
  return /^[a-z][a-z0-9-]*$/.test(name);
}

/**
 * Generate tool YAML template
 */
async function generateToolYAML(
  name: string,
  options: ToolCreateOptions
): Promise<string> {
  // Dynamic import to avoid loading js-yaml at module time
  const yaml = await import('js-yaml');

  const toolDef: any = {
    name,
    type: 'tool',
    description: options.description || `${name} tool`,
    version: '1.0.0',
    tags: [],
  };

  if (options.command) {
    toolDef.command = options.command;
  } else {
    toolDef.command = {
      execute: `echo "Tool ${name} executed"`,
    };
  }

  toolDef.input_schema = {
    type: 'object',
    properties: {},
    required: [],
  };

  return yaml.dump(toolDef, { indent: 2, lineWidth: 100 });
}

export function toolCreateCommand(): Command {
  const cmd = new Command('tool-create');

  cmd
    .description('Create a new tool definition')
    .argument('<name>', 'Tool name (lowercase-with-hyphens)')
    .option('--description <text>', 'Tool description')
    .option('--command <command>', 'Command to execute')
    .option('--interactive', 'Interactive creation mode')
    .action(async (name: string, options: ToolCreateOptions) => {
      try {
        // Validate name
        if (!validateToolName(name)) {
          console.error(chalk.red('Error: Invalid tool name'));
          console.log(chalk.dim('Tool names must be lowercase-with-hyphens'));
          console.log(chalk.dim('Examples: my-tool, code-formatter, test-runner'));
          process.exit(1);
        }

        const client = await getClient();
        const config = client.getConfig();
        const toolsPath = path.join(
          client.getProjectRoot(),
          config.registry.local.tools_path
        );
        const toolFile = path.join(toolsPath, `${name}.yaml`);

        // Check if tool already exists
        try {
          await fs.access(toolFile);
          console.error(chalk.red(`Error: Tool '${name}' already exists`));
          console.log(chalk.dim(`File: ${toolFile}`));
          process.exit(1);
        } catch {
          // File doesn't exist, continue
        }

        // Generate YAML
        const yamlContent = await generateToolYAML(name, options);

        // Write file
        await fs.writeFile(toolFile, yamlContent, 'utf-8');

        console.log(chalk.green('\n✓ Tool created successfully!'));
        console.log('');
        console.log(chalk.bold('Tool:'), chalk.cyan(name));
        console.log(chalk.bold('File:'), toolFile);
        console.log('');
        console.log(chalk.dim('Next steps:'));
        console.log(chalk.dim('  1. Edit the tool file to customize'));
        console.log(chalk.dim('  2. Validate:'), chalk.cyan(`fractary-forge tool-validate ${name}`));
        console.log(chalk.dim('  3. View info:'), chalk.cyan(`fractary-forge tool-info ${name}`));
        console.log('');

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
