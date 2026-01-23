/**
 * Initialize Forge Configuration Command (DEPRECATED)
 *
 * This command is deprecated. Use `fractary-forge configure` instead.
 *
 * This file is kept for backward compatibility. It delegates to the
 * configure command with a deprecation warning.
 */

import { Command } from 'commander';
import chalk from 'chalk';

/**
 * @deprecated Use configureCommand() instead
 */
export function initCommand(): Command {
  const cmd = new Command('init');

  cmd
    .description('[DEPRECATED] Use "configure" instead. Initialize Forge configuration.')
    .option('--org <slug>', 'Organization slug (e.g., "fractary")')
    .option('--global', 'Also initialize global registry (~/.fractary/registry)')
    .option('--force', 'Overwrite existing configuration')
    .action(async (options) => {
      // Show deprecation warning
      console.log(chalk.yellow('⚠ Warning: "fractary-forge init" is deprecated.'));
      console.log(chalk.yellow('  Please use "fractary-forge configure" instead.\n'));

      try {
        // Delegate to configure command functionality
        const {
          findProjectRoot,
          forgeConfigExists,
          needsMigration,
          migrateOldForgeConfig,
          initializeForgeConfig,
          loadForgeSection,
        } = await import('@fractary/forge');

        const path = await import('path');

        console.log(chalk.blue('Configuring Forge...\n'));

        // Find project root
        const projectRoot = await findProjectRoot() || process.cwd();

        // Resolve organization
        let org = options.org;

        if (!org) {
          // Try git remote first
          try {
            const { execSync } = require('child_process');
            const remote = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf-8' }).trim();
            const sshMatch = remote.match(/git@github\.com:([^/]+)\//);
            const httpsMatch = remote.match(/github\.com\/([^/]+)\//);
            org = sshMatch?.[1] || httpsMatch?.[1] || null;
          } catch {
            org = null;
          }
        }

        if (!org) {
          org = path.basename(projectRoot).split('-')[0] || 'default';
          console.log(chalk.yellow(`⚠ Could not detect organization, using: ${org}`));
          console.log(chalk.dim('  Use --org <slug> to specify explicitly\n'));
        } else {
          console.log(chalk.dim(`Organization: ${chalk.cyan(org)}\n`));
        }

        // Check for existing config
        const exists = await forgeConfigExists(projectRoot);

        if (exists && !options.force) {
          console.log(chalk.yellow('⚠ Forge configuration already exists in .fractary/config.yaml'));
          console.log(chalk.dim('  Use --force to overwrite'));
          console.log(chalk.dim('  Use "fractary-forge configure --validate-only" to check current configuration'));
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
        console.log(chalk.dim('  Agents:'), config.registry.local.agents_path);
        console.log(chalk.dim('  Tools:'), config.registry.local.tools_path);

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
