/**
 * Initialize Forge Configuration Command
 *
 * Creates .fractary/forge/config.yaml with:
 * - Organization detection from git remote
 * - Registry configuration (local, global, stockyard)
 * - Lockfile configuration
 * - Update settings
 * - Default agent/tool settings
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Extract organization from git remote URL
 */
async function getOrgFromGitRemote(): Promise<string | null> {
  try {
    const { execSync } = require('child_process');
    const remote = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf-8' }).trim();

    // Parse GitHub URL: git@github.com:org/repo.git or https://github.com/org/repo.git
    const sshMatch = remote.match(/git@github\.com:([^/]+)\//);
    const httpsMatch = remote.match(/github\.com\/([^/]+)\//);

    return sshMatch?.[1] || httpsMatch?.[1] || null;
  } catch {
    return null;
  }
}

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${(error as Error).message}`);
  }
}

export function initCommand(): Command {
  const cmd = new Command('init');

  cmd
    .description('Initialize Forge configuration for agent/tool management')
    .option('--org <slug>', 'Organization slug (e.g., "fractary")')
    .option('--global', 'Also initialize global registry (~/.fractary/registry)')
    .option('--force', 'Overwrite existing configuration')
    .action(async (options) => {
      try {
        // Dynamic import to avoid loading js-yaml at module time
        const { createDefaultConfig, configExists } = await import('../config/migrate-config.js');

        console.log(chalk.blue('Initializing Forge configuration...\n'));

        // Resolve organization
        let org = options.org;

        if (!org) {
          // Try git remote first
          org = await getOrgFromGitRemote();
        }

        if (!org) {
          // Default fallback
          org = path.basename(process.cwd()).split('-')[0] || 'default';
          console.log(chalk.yellow(`⚠ Could not detect organization, using: ${org}`));
          console.log(chalk.dim('  Use --org <slug> to specify explicitly\n'));
        } else {
          console.log(chalk.dim(`Organization: ${chalk.cyan(org)}\n`));
        }

        // Config paths
        const configDir = path.join(process.cwd(), '.fractary/forge');
        const configPath = path.join(configDir, 'config.yaml');
        const exists = await configExists(configPath);

        if (exists && !options.force) {
          console.log(chalk.yellow('⚠ Configuration already exists at .fractary/forge/config.yaml'));
          console.log(chalk.dim('Use --force to overwrite'));
          process.exit(1);
        }

        // Create directory structure
        console.log(chalk.dim('Creating directory structure...'));
        await ensureDir(configDir);
        await ensureDir(path.join(process.cwd(), '.fractary/agents'));
        await ensureDir(path.join(process.cwd(), '.fractary/tools'));
        console.log(chalk.green('✓'), chalk.dim('.fractary/forge/'));
        console.log(chalk.green('✓'), chalk.dim('.fractary/agents/'));
        console.log(chalk.green('✓'), chalk.dim('.fractary/tools/'));

        // Create global registry if requested
        if (options.global) {
          const globalDir = path.join(require('os').homedir(), '.fractary/registry');
          await ensureDir(path.join(globalDir, 'agents'));
          await ensureDir(path.join(globalDir, 'tools'));
          console.log(chalk.green('✓'), chalk.dim('~/.fractary/registry/'));
        }

        // Create configuration
        console.log(chalk.dim('\nGenerating configuration...'));
        await createDefaultConfig(configPath, org);
        console.log(chalk.green('✓'), chalk.dim('config.yaml created'));

        // Success message
        console.log(chalk.green('\n✨ Forge initialized successfully!\n'));

        console.log(chalk.bold('Configuration:'));
        console.log(chalk.dim('  File: .fractary/forge/config.yaml'));
        console.log(chalk.dim('  Organization:'), chalk.cyan(org));
        console.log(chalk.dim('  Agents:'), '.fractary/agents/');
        console.log(chalk.dim('  Tools:'), '.fractary/tools/');

        console.log(chalk.bold('\nNext steps:'));
        console.log(chalk.dim('  1. Create an agent:'), chalk.cyan('fractary-forge agent-create <name>'));
        console.log(chalk.dim('  2. Create a tool:'), chalk.cyan('fractary-forge tool-create <name>'));
        console.log(chalk.dim('  3. List agents:'), chalk.cyan('fractary-forge agent-list'));

      } catch (error) {
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
      }
    });

  return cmd;
}
