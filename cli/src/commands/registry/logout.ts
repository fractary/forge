/**
 * Forge Logout Command
 *
 * Deauthenticate from a registry.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { clearAuth, getAuthStatus } from '../../utils/auth-manager.js';
import { loadCredentials, getAuthenticatedRegistries } from '../../utils/credential-storage.js';
import { formatSuccess, formatWarning, formatError } from '../../utils/formatters.js';

interface LogoutOptions {
  all?: boolean;
  force?: boolean;
  verbose?: boolean;
}

/**
 * Create logout command
 */
export function createLogoutCommand(): Command {
  const cmd = new Command('logout');

  cmd
    .description('Deauthenticate from a registry')
    .argument('[registry]', 'Registry name (default: stockyard)', 'stockyard')
    .option('-a, --all', 'Logout from all registries')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (registry: string, options: LogoutOptions) => {
      try {
        await logoutCommand(registry, options);
      } catch (error) {
        handleLogoutError(error);
      }
    });

  return cmd;
}

/**
 * Logout command implementation
 */
async function logoutCommand(registry: string, options: LogoutOptions): Promise<void> {
  if (options.verbose) {
    console.log(chalk.dim(`Mode: ${options.all ? 'logout all' : `logout ${registry}`}`));
    console.log();
  }

  // Display logout header
  console.log();

  if (options.all) {
    // Logout from all registries
    console.log(chalk.bold('Logout from all registries'));
    console.log();

    const authenticated = await getAuthenticatedRegistries();

    if (authenticated.length === 0) {
      console.log(chalk.yellow('ℹ No authenticated registries found'));
      process.exit(0);
    }

    console.log(`Authenticated registries (${authenticated.length}):`);
    console.log();
    authenticated.forEach((reg) => {
      console.log(`  • ${chalk.cyan(reg)}`);
    });
    console.log();

    // Confirm
    if (!options.force) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Logout from ${authenticated.length} registry(ies)?`,
          default: false,
        },
      ]);

      if (!answer.confirm) {
        console.log(chalk.dim('Logout cancelled'));
        process.exit(0);
      }
    }

    // Logout from all
    for (const reg of authenticated) {
      await clearAuth(reg);

      if (options.verbose) {
        console.log(chalk.dim(`Logged out from ${reg}`));
      }
    }

    console.log();
    formatSuccess(`Logged out from ${authenticated.length} registry(ies)`);
    console.log();
  } else {
    // Logout from specific registry
    console.log(chalk.bold(`Logout from ${chalk.cyan(registry)}`));
    console.log();

    const status = await getAuthStatus(registry);

    if (!status.authenticated && !status.username) {
      console.log(chalk.yellow(`ℹ Not authenticated with ${registry}`));
      process.exit(0);
    }

    if (status.username) {
      console.log(`Current user: ${chalk.cyan(status.username)}`);
      if (status.email) {
        console.log(`Email: ${chalk.dim(status.email)}`);
      }
      if (status.expires_at && !status.is_expired) {
        const expiresAt = new Date(status.expires_at);
        console.log(`Session expires: ${chalk.dim(expiresAt.toLocaleString())}`);
      }
      console.log();
    }

    // Confirm logout
    if (!options.force) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Logout from ${registry}?`,
          default: false,
        },
      ]);

      if (!answer.confirm) {
        console.log(chalk.dim('Logout cancelled'));
        process.exit(0);
      }
    }

    // Perform logout
    await clearAuth(registry);

    console.log();
    formatSuccess(`Logged out from ${registry}`);
    console.log();

    if (options.verbose) {
      console.log(chalk.dim('Credentials have been removed'));
      console.log(chalk.dim('Configuration remains unchanged'));
    }
    console.log();
  }

  process.exit(0);
}

/**
 * Handle logout command errors
 */
function handleLogoutError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('auth')) {
    hints.push('Authentication error');
    hints.push('Check your authentication status');
  } else if (err.message.includes('permission')) {
    hints.push('Permission denied');
    hints.push('Check file/directory permissions');
  }

  formatError(err, 'Logout failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createLogoutCommand;
