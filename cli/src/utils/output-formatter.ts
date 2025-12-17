/**
 * Output Formatting Utilities for Forge CLI
 *
 * Provides consistent formatting for agent and tool information
 */

import chalk from 'chalk';
import type { AgentInfo, ToolInfo } from '@fractary/forge';

/**
 * Format agent information for display
 */
export function formatAgentInfo(
  info: AgentInfo,
  options?: {
    showTools?: boolean;
    showPrompt?: boolean;
  }
): string {
  const lines: string[] = [];

  lines.push(chalk.bold.cyan(`\nAgent: ${info.name}`));
  lines.push(chalk.dim('─'.repeat(50)));

  lines.push(`${chalk.bold('Version:')} ${chalk.green(info.version)}`);
  lines.push(`${chalk.bold('Source:')} ${chalk.yellow(info.source)}`);

  if (info.description) {
    lines.push(`${chalk.bold('Description:')} ${info.description}`);
  }

  if (info.tags && info.tags.length > 0) {
    lines.push(`${chalk.bold('Tags:')} ${info.tags.join(', ')}`);
  }

  if (info.author) {
    lines.push(`${chalk.bold('Author:')} ${info.author}`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Format tool information for display
 */
export function formatToolInfo(info: ToolInfo): string {
  const lines: string[] = [];

  lines.push(chalk.bold.cyan(`\nTool: ${info.name}`));
  lines.push(chalk.dim('─'.repeat(50)));

  lines.push(`${chalk.bold('Version:')} ${chalk.green(info.version)}`);
  lines.push(`${chalk.bold('Source:')} ${chalk.yellow(info.source)}`);

  if (info.description) {
    lines.push(`${chalk.bold('Description:')} ${info.description}`);
  }

  if (info.tags && info.tags.length > 0) {
    lines.push(`${chalk.bold('Tags:')} ${info.tags.join(', ')}`);
  }

  if (info.author) {
    lines.push(`${chalk.bold('Author:')} ${info.author}`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Format agent list as table
 */
export function formatAgentList(agents: AgentInfo[]): string {
  if (agents.length === 0) {
    return chalk.dim('No agents found');
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('\nAvailable Agents:'));
  lines.push(chalk.dim('─'.repeat(80)));

  for (const agent of agents) {
    lines.push('');
    lines.push(chalk.green(`  ${agent.name}`) + chalk.dim(` @${agent.version}`));
    if (agent.description) {
      lines.push(chalk.dim(`    ${agent.description}`));
    }
    lines.push(chalk.dim(`    Source: ${agent.source}`));
    if (agent.tags && agent.tags.length > 0) {
      lines.push(chalk.dim(`    Tags: ${agent.tags.join(', ')}`));
    }
  }

  lines.push('');
  lines.push(chalk.dim('─'.repeat(80)));
  lines.push(chalk.bold(`Total: ${agents.length} agent(s)`));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format tool list as table
 */
export function formatToolList(tools: ToolInfo[]): string {
  if (tools.length === 0) {
    return chalk.dim('No tools found');
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('\nAvailable Tools:'));
  lines.push(chalk.dim('─'.repeat(80)));

  for (const tool of tools) {
    lines.push('');
    lines.push(chalk.green(`  ${tool.name}`) + chalk.dim(` @${tool.version}`));
    if (tool.description) {
      lines.push(chalk.dim(`    ${tool.description}`));
    }
    lines.push(chalk.dim(`    Source: ${tool.source}`));
    if (tool.tags && tool.tags.length > 0) {
      lines.push(chalk.dim(`    Tags: ${tool.tags.join(', ')}`));
    }
  }

  lines.push('');
  lines.push(chalk.dim('─'.repeat(80)));
  lines.push(chalk.bold(`Total: ${tools.length} tool(s)`));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format validation errors
 */
export function formatValidationErrors(errors: any[]): string {
  if (errors.length === 0) {
    return chalk.green('✓ No errors found');
  }

  const lines: string[] = [];
  lines.push(chalk.red(`\n✗ Found ${errors.length} validation error(s):`));
  lines.push('');

  for (const error of errors) {
    lines.push(chalk.red(`  • ${error.message || error}`));
    if (error.path) {
      lines.push(chalk.dim(`    Path: ${error.path}`));
    }
  }

  lines.push('');
  return lines.join('\n');
}
