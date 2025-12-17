/**
 * Forge Whoami Command
 *
 * Display current authenticated user information.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getAuthStatus, formatAuthStatus } from '../../utils/auth-manager.js';
import { getAuthenticatedRegistries } from '../../utils/credential-storage.js';
import { formatError } from '../../utils/formatters.js';

interface WhoamiOptions {
  json?: boolean;
  verbose?: boolean;
  all?: boolean;
}

/**
 * Create whoami command
 */
export function createWhoamiCommand(): Command {
  const cmd = new Command('whoami');

  cmd
    .description('Show current authenticated user')
    .argument('[registry]', 'Registry name (default: stockyard)', 'stockyard')
    .option('--json', 'Output as JSON for scripting')
    .option('-v, --verbose', 'Show detailed user information')
    .option('-a, --all', 'Show user info for all authenticated registries')
    .action(async (registry: string, options: WhoamiOptions) => {
      try {
        await whoamiCommand(registry, options);
      } catch (error) {
        handleWhoamiError(error);
      }
    });

  return cmd;
}

/**
 * Whoami command implementation
 */
async function whoamiCommand(registry: string, options: WhoamiOptions): Promise<void> {
  if (options.all) {
    // Show all authenticated registries
    const authenticated = await getAuthenticatedRegistries();

    if (options.json) {
      // JSON output
      const results = [];

      for (const reg of authenticated) {
        const status = await getAuthStatus(reg);
        results.push({
          registry: status.registry,
          authenticated: status.authenticated,
          username: status.username,
          email: status.email,
          auth_type: status.auth_type,
          authenticated_at: status.authenticated_at,
          expires_at: status.expires_at,
          is_expired: status.is_expired,
        });
      }

      console.log(JSON.stringify(results, null, 2));
    } else {
      // Text output
      console.log();
      console.log(chalk.bold('Authenticated Registries'));
      console.log();

      if (authenticated.length === 0) {
        console.log(chalk.yellow('ℹ No authenticated registries'));
        process.exit(0);
      }

      const table = new Table({
        head: ['Registry', 'Username', 'Email', 'Auth Type', 'Status'],
        colWidths: [20, 20, 30, 12, 20],
        style: { head: [], border: ['grey'] },
      });

      for (const reg of authenticated) {
        const status = await getAuthStatus(reg);
        const statusStr = status.is_expired ? chalk.red('Expired') : chalk.green('Active');

        table.push([
          reg,
          status.username || '-',
          status.email || '-',
          status.auth_type || '-',
          statusStr,
        ]);
      }

      console.log(table.toString());
      console.log();
    }
  } else {
    // Single registry
    const status = await getAuthStatus(registry);

    if (options.json) {
      // JSON output
      console.log(
        JSON.stringify(
          {
            registry: status.registry,
            authenticated: status.authenticated,
            username: status.username,
            email: status.email,
            auth_type: status.auth_type,
            authenticated_at: status.authenticated_at,
            expires_at: status.expires_at,
            is_expired: status.is_expired,
          },
          null,
          2
        )
      );
    } else {
      // Text output
      console.log();

      if (!status.authenticated && !status.username) {
        console.log(chalk.bold(`Registry: ${chalk.cyan(registry)}`));
        console.log();
        console.log(chalk.yellow('Not authenticated'));
        console.log();
        console.log(chalk.dim('Run: fractary-forge login ' + registry));
      } else {
        console.log(chalk.bold(`Registry: ${chalk.cyan(registry)}`));
        console.log();

        if (status.username) {
          console.log(`Username:  ${chalk.cyan(status.username)}`);
        }

        if (status.email) {
          console.log(`Email:     ${chalk.cyan(status.email)}`);
        }

        if (status.auth_type) {
          console.log(`Auth Type: ${chalk.cyan(status.auth_type)}`);
        }

        if (status.authenticated_at) {
          console.log(
            `Logged In:  ${chalk.dim(new Date(status.authenticated_at).toLocaleString())}`
          );
        }

        if (status.expires_at) {
          const expiresAt = new Date(status.expires_at);
          const isExpired = status.is_expired;
          const expiresStr = isExpired ? chalk.red(expiresAt.toLocaleString()) : expiresAt.toLocaleString();
          console.log(`Expires:   ${chalk.dim(expiresStr)}`);
        }

        if (status.is_expired) {
          console.log();
          console.log(chalk.yellow('⚠ Session expired'));
        }
      }

      console.log();

      if (options.verbose) {
        console.log(chalk.bold('Additional Information:'));
        console.log();

        console.log(chalk.dim('Registry Details:'));
        console.log(chalk.dim(`  URL: https://stockyard.fractary.dev`));
        console.log(chalk.dim(`  Type: Stockyard`));
        console.log();

        console.log(chalk.dim('Auth Configuration:'));
        console.log(chalk.dim(`  Location: ~/.fractary/auth/credentials.json`));
        console.log(chalk.dim(`  Encryption: AES-256-CBC`));
        console.log();
      }
    }
  }

  process.exit(0);
}

/**
 * Handle whoami command errors
 */
function handleWhoamiError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('auth')) {
    hints.push('Authentication error');
    hints.push('Check your authentication status');
  } else if (err.message.includes('permission')) {
    hints.push('Permission denied');
    hints.push('Check file/directory permissions');
  }

  formatError(err, 'Whoami failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createWhoamiCommand;
