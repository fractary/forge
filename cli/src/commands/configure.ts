/**
 * Configure Forge Command
 *
 * Manages forge configuration in the unified config file (.fractary/config.yaml).
 *
 * Options:
 *   --org <slug>       Organization slug
 *   --global           Also init global registry
 *   --force            Overwrite existing config
 *   --dry-run          Preview changes without applying
 *   --validate-only    Validate existing config
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';

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

export function configureCommand(): Command {
  const cmd = new Command('configure');

  cmd
    .description('Configure Forge in the unified config file (.fractary/config.yaml)')
    .option('--org <slug>', 'Organization slug (e.g., "fractary")')
    .option('--global', 'Also initialize global registry (~/.fractary/registry)')
    .option('--force', 'Overwrite existing configuration')
    .option('--dry-run', 'Preview changes without applying')
    .option('--validate-only', 'Validate existing configuration')
    .action(async (options) => {
      try {
        // Dynamic import to avoid loading SDK at module time
        const {
          findProjectRoot,
          forgeConfigExists,
          needsMigration,
          migrateOldForgeConfig,
          initializeForgeConfig,
          validateForgeConfiguration,
          previewForgeConfig,
          loadForgeSection,
        } = await import('@fractary/forge');

        // Handle --validate-only
        if (options.validateOnly) {
          console.log(chalk.blue('Validating Forge configuration...\n'));

          const projectRoot = await findProjectRoot();
          if (!projectRoot) {
            console.log(chalk.red('Error: Not in a Fractary project (no .fractary or .git directory found)'));
            process.exit(1);
          }

          const result = await validateForgeConfiguration(projectRoot);

          if (result.valid) {
            console.log(chalk.green('✓'), 'Configuration is valid\n');
            console.log(chalk.dim('Organization:'), chalk.cyan(result.config?.organization));
            console.log(chalk.dim('Schema version:'), chalk.cyan(result.config?.schema_version));
            console.log(chalk.dim('Local registry:'), result.config?.registry?.local?.enabled ? chalk.green('enabled') : chalk.yellow('disabled'));
            console.log(chalk.dim('Global registry:'), result.config?.registry?.global?.enabled ? chalk.green('enabled') : chalk.yellow('disabled'));
            console.log(chalk.dim('Stockyard:'), result.config?.registry?.stockyard?.enabled ? chalk.green('enabled') : chalk.yellow('disabled'));
          } else {
            console.log(chalk.red('✗'), 'Configuration has errors:\n');
            for (const error of result.errors || []) {
              console.log(chalk.red('  •'), `${error.path}: ${error.message}`);
            }
            process.exit(1);
          }
          return;
        }

        console.log(chalk.blue('Configuring Forge...\n'));

        // Find project root
        const projectRoot = await findProjectRoot() || process.cwd();

        // Resolve organization
        let org = options.org;

        if (!org) {
          // Try git remote first
          org = await getOrgFromGitRemote();
        }

        if (!org) {
          // Default fallback
          org = path.basename(projectRoot).split('-')[0] || 'default';
          console.log(chalk.yellow(`⚠ Could not detect organization, using: ${org}`));
          console.log(chalk.dim('  Use --org <slug> to specify explicitly\n'));
        } else {
          console.log(chalk.dim(`Organization: ${chalk.cyan(org)}\n`));
        }

        // Handle --dry-run
        if (options.dryRun) {
          console.log(chalk.blue('Dry run mode - showing what would be created:\n'));

          const preview = previewForgeConfig(projectRoot, org);

          console.log(chalk.bold('Configuration file:'));
          console.log(chalk.dim('  Path:'), preview.configPath);
          console.log();

          console.log(chalk.bold('Forge section:'));
          console.log(chalk.dim(yaml.dump(preview.forgeConfig, { indent: 2 })));

          console.log(chalk.bold('Directories to create:'));
          for (const dir of preview.directories) {
            console.log(chalk.dim('  •'), dir);
          }

          console.log(chalk.yellow('\nNo changes made (dry run).'));
          return;
        }

        // Check for existing config
        const exists = await forgeConfigExists(projectRoot);

        if (exists && !options.force) {
          console.log(chalk.yellow('⚠ Forge configuration already exists in .fractary/config.yaml'));
          console.log(chalk.dim('  Use --force to overwrite'));
          console.log(chalk.dim('  Use --validate-only to check current configuration'));
          process.exit(1);
        }

        // Check for migration from old config
        const needsMigrationCheck = await needsMigration(projectRoot);
        if (needsMigrationCheck) {
          console.log(chalk.blue('Found old configuration at .fractary/forge/config.yaml'));
          console.log(chalk.dim('Migrating to unified config...\n'));

          const migrationResult = await migrateOldForgeConfig(projectRoot);
          if (migrationResult.migrated) {
            console.log(chalk.green('✓'), 'Configuration migrated successfully');
            console.log(chalk.dim('  Backup created at:'), migrationResult.backupPath);
            console.log();
          }
        } else {
          // Initialize new configuration
          console.log(chalk.dim('Creating directory structure...'));

          await initializeForgeConfig(projectRoot, org, {
            force: options.force,
            initGlobal: options.global,
          });

          console.log(chalk.green('✓'), chalk.dim('.fractary/config.yaml (forge section)'));
          console.log(chalk.green('✓'), chalk.dim('.fractary/agents/'));
          console.log(chalk.green('✓'), chalk.dim('.fractary/tools/'));
          console.log(chalk.green('✓'), chalk.dim('.fractary/forge/'));

          if (options.global) {
            console.log(chalk.green('✓'), chalk.dim('~/.fractary/registry/'));
          }
        }

        // Load and display final config
        const config = await loadForgeSection(projectRoot);

        // Success message
        console.log(chalk.green('\n✨ Forge configured successfully!\n'));

        console.log(chalk.bold('Configuration:'));
        console.log(chalk.dim('  File: .fractary/config.yaml (forge section)'));
        console.log(chalk.dim('  Organization:'), chalk.cyan(config.organization));
        console.log(chalk.dim('  Schema version:'), chalk.cyan(config.schema_version));
        console.log(chalk.dim('  Agents:'), config.registry.local.agents_path);
        console.log(chalk.dim('  Tools:'), config.registry.local.tools_path);

        console.log(chalk.bold('\nNext steps:'));
        console.log(chalk.dim('  1. Create an agent:'), chalk.cyan('fractary-forge agent-create <name>'));
        console.log(chalk.dim('  2. Create a tool:'), chalk.cyan('fractary-forge tool-create <name>'));
        console.log(chalk.dim('  3. List agents:'), chalk.cyan('fractary-forge agent-list'));
        console.log(chalk.dim('  4. Validate config:'), chalk.cyan('fractary-forge configure --validate-only'));

      } catch (error) {
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
      }
    });

  return cmd;
}
