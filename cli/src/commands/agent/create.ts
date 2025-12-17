/**
 * Agent Create Command
 *
 * Create a new agent definition
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getClient } from '../../client/get-client.js';

interface AgentCreateOptions {
  description?: string;
  model?: string;
  modelName?: string;
  tools?: string;
  prompt?: string;
  extends?: string;
  interactive?: boolean;
}

/**
 * Validate agent name format
 */
function validateAgentName(name: string): boolean {
  // Must be lowercase with hyphens, no special characters
  return /^[a-z][a-z0-9-]*$/.test(name);
}

/**
 * Generate agent YAML template
 */
async function generateAgentYAML(
  name: string,
  options: AgentCreateOptions,
  config: any
): Promise<string> {
  // Dynamic import to avoid loading js-yaml at module time
  const yaml = await import('js-yaml');

  const defaults = config.defaults.agent;

  const agentDef: any = {
    name,
    type: 'agent',
    description: options.description || `${name} agent`,
    version: '1.0.0',
    tags: [],
  };

  if (options.extends) {
    agentDef.extends = options.extends;
  }

  agentDef.llm = {
    provider: options.model || defaults.model.provider,
    model: options.modelName || defaults.model.name,
    temperature: defaults.config.temperature,
    max_tokens: defaults.config.max_tokens,
  };

  agentDef.system_prompt = options.prompt || `You are a helpful ${name} agent.`;

  if (options.tools) {
    agentDef.tools = options.tools.split(',').map(t => t.trim());
  } else {
    agentDef.tools = [];
  }

  return yaml.dump(agentDef, { indent: 2, lineWidth: 100 });
}

export function agentCreateCommand(): Command {
  const cmd = new Command('agent-create');

  cmd
    .description('Create a new agent definition')
    .argument('<name>', 'Agent name (lowercase-with-hyphens)')
    .option('--description <text>', 'Agent description')
    .option('--model <provider>', 'LLM provider (anthropic|openai|google)')
    .option('--model-name <name>', 'Model name (e.g., claude-sonnet-4)')
    .option('--tools <tools>', 'Tool references (comma-separated)')
    .option('--prompt <text>', 'System prompt')
    .option('--extends <agent>', 'Extend existing agent')
    .option('--interactive', 'Interactive creation mode')
    .action(async (name: string, options: AgentCreateOptions) => {
      try {
        // Validate name
        if (!validateAgentName(name)) {
          console.error(chalk.red('Error: Invalid agent name'));
          console.log(chalk.dim('Agent names must be lowercase-with-hyphens'));
          console.log(chalk.dim('Examples: my-agent, code-reviewer, test-agent'));
          process.exit(1);
        }

        const client = await getClient();
        const config = client.getConfig();
        const agentsPath = path.join(
          client.getProjectRoot(),
          config.registry.local.agents_path
        );
        const agentFile = path.join(agentsPath, `${name}.yaml`);

        // Check if agent already exists
        try {
          await fs.access(agentFile);
          console.error(chalk.red(`Error: Agent '${name}' already exists`));
          console.log(chalk.dim(`File: ${agentFile}`));
          process.exit(1);
        } catch {
          // File doesn't exist, continue
        }

        // Generate YAML
        const yamlContent = await generateAgentYAML(name, options, config);

        // Write file
        await fs.writeFile(agentFile, yamlContent, 'utf-8');

        console.log(chalk.green('\n✓ Agent created successfully!'));
        console.log('');
        console.log(chalk.bold('Agent:'), chalk.cyan(name));
        console.log(chalk.bold('File:'), agentFile);
        console.log('');
        console.log(chalk.dim('Next steps:'));
        console.log(chalk.dim('  1. Edit the agent file to customize'));
        console.log(chalk.dim('  2. Validate:'), chalk.cyan(`fractary-forge agent-validate ${name}`));
        console.log(chalk.dim('  3. View info:'), chalk.cyan(`fractary-forge agent-info ${name}`));
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
