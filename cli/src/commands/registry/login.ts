/**
 * Forge Login Command
 *
 * Authenticate with a registry.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  authenticateRegistry,
  createTokenAuth,
  createBasicAuth,
  formatAuthStatus,
  getAuthStatus,
} from '../../utils/auth-manager.js';
import { formatSuccess, formatWarning, formatError } from '../../utils/formatters.js';

interface LoginOptions {
  token?: string;
  tokenEnv?: string;
  username?: string;
  force?: boolean;
  verbose?: boolean;
}

/**
 * Create login command
 */
export function createLoginCommand(): Command {
  const cmd = new Command('login');

  cmd
    .description('Authenticate with a registry')
    .argument('[registry]', 'Registry name (default: stockyard)', 'stockyard')
    .option('--token <token>', 'Provide authentication token')
    .option('--token-env <var>', 'Use token from environment variable')
    .option('--username <user>', 'Username for interactive prompt')
    .option('-f, --force', 'Force re-authentication')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (registry: string, options: LoginOptions) => {
      try {
        await loginCommand(registry, options);
      } catch (error) {
        handleLoginError(error);
      }
    });

  return cmd;
}

/**
 * Login command implementation
 */
async function loginCommand(registry: string, options: LoginOptions): Promise<void> {
  if (options.verbose) {
    console.log(chalk.dim(`Registry: ${registry}`));
    console.log();
  }

  // Display login header
  console.log();
  console.log(chalk.bold(`Login to ${chalk.cyan(registry)}`));
  console.log();

  // Determine authentication method
  let token: string | undefined;

  // Check token from options
  if (options.token) {
    token = options.token;
    if (options.verbose) {
      console.log(chalk.dim('Using token from --token option'));
    }
  }

  // Check token from environment variable
  if (!token && options.tokenEnv) {
    token = process.env[options.tokenEnv];
    if (!token) {
      console.error(chalk.red(`✗ Environment variable ${options.tokenEnv} not found`));
      process.exit(1);
    }
    if (options.verbose) {
      console.log(chalk.dim(`Using token from ${options.tokenEnv} environment variable`));
    }
  }

  // Interactive authentication
  if (!token) {
    console.log('Choose authentication method:');
    console.log();

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'authMethod',
        message: 'Authentication method',
        choices: [
          { name: 'Personal Access Token', value: 'token' },
          { name: 'Username & Password', value: 'basic' },
        ],
        default: 'token',
      },
    ]);

    console.log();

    if (answers.authMethod === 'token') {
      // Token authentication
      const tokenAnswers = await inquirer.prompt([
        {
          type: 'password',
          name: 'token',
          message: 'Personal Access Token',
          mask: '*',
        },
        {
          type: 'input',
          name: 'email',
          message: 'Email (optional)',
        },
      ]);

      token = tokenAnswers.token;

      if (!token) {
        console.error(chalk.red('Error: Token is required'));
        process.exit(1);
      }

      try {
        const auth = createTokenAuth(token, tokenAnswers.email || undefined);
        await authenticateRegistry(registry, auth);

        console.log();
        formatSuccess(`Authenticated with ${registry}`);
        console.log();

        // Show user info
        const status = await getAuthStatus(registry);
        console.log(chalk.bold('Authentication Details:'));
        console.log();
        console.log(formatAuthStatus(status));
        console.log();
      } catch (error) {
        console.error(chalk.red(`✗ Authentication failed`));
        console.error(chalk.yellow((error as Error).message));
        process.exit(1);
      }
    } else {
      // Basic authentication
      const basicAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'username',
          message: 'Username',
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password',
          mask: '*',
        },
        {
          type: 'input',
          name: 'email',
          message: 'Email (optional)',
        },
      ]);

      try {
        const auth = createBasicAuth(
          basicAnswers.username,
          basicAnswers.password,
          basicAnswers.email || undefined
        );
        await authenticateRegistry(registry, auth);

        console.log();
        formatSuccess(`Authenticated with ${registry}`);
        console.log();

        const status = await getAuthStatus(registry);
        console.log(chalk.bold('Authentication Details:'));
        console.log();
        console.log(formatAuthStatus(status));
        console.log();
      } catch (error) {
        console.error(chalk.red(`✗ Authentication failed`));
        console.error(chalk.yellow((error as Error).message));
        process.exit(1);
      }
    }
  } else {
    // Non-interactive token authentication
    try {
      const auth = createTokenAuth(token);
      await authenticateRegistry(registry, auth);

      console.log();
      formatSuccess(`Authenticated with ${registry}`);
      console.log();

      const status = await getAuthStatus(registry);
      console.log(chalk.bold('Authentication Details:'));
      console.log();
      console.log(formatAuthStatus(status));
      console.log();
    } catch (error) {
      console.error(chalk.red(`✗ Authentication failed`));
      console.error(chalk.yellow((error as Error).message));
      process.exit(1);
    }
  }

  process.exit(0);
}

/**
 * Handle login command errors
 */
function handleLoginError(error: unknown): never {
  const err = error as Error;

  const hints: string[] = [];

  if (err.message.includes('network')) {
    hints.push('Network error connecting to registry');
    hints.push('Check your internet connection');
  } else if (err.message.includes('credential')) {
    hints.push('Invalid credentials');
    hints.push('Check username and password');
  } else if (err.message.includes('permission')) {
    hints.push('Permission denied');
    hints.push('Check file/directory permissions');
  }

  formatError(err, 'Login failed', hints.length > 0 ? hints : undefined);
  process.exit(1);
}

// Export for use in index
export default createLoginCommand;
