/**
 * Validation Reporter for Forge CLI
 *
 * Provides formatted output for validation results
 */

import chalk from 'chalk';

export class ValidationReporter {
  /**
   * Report agent validation results
   */
  static reportAgentValidation(result: any): void {
    if (result.valid) {
      console.log(chalk.green('\n✓ Agent definition is valid'));
      console.log(chalk.dim(`  Name: ${result.name}`));
      console.log(chalk.dim(`  Version: ${result.version}`));
      console.log('');
    } else {
      console.log(chalk.red('\n✗ Agent definition is invalid'));
      console.log('');

      if (result.errors && result.errors.length > 0) {
        console.log(chalk.red(`Found ${result.errors.length} error(s):`));
        for (const error of result.errors) {
          console.log(chalk.red(`  • ${error.message || error}`));
          if (error.path) {
            console.log(chalk.dim(`    Path: ${error.path}`));
          }
        }
      }
      console.log('');
    }
  }

  /**
   * Report tool validation results
   */
  static reportToolValidation(result: any): void {
    if (result.valid) {
      console.log(chalk.green('\n✓ Tool definition is valid'));
      console.log(chalk.dim(`  Name: ${result.name}`));
      console.log(chalk.dim(`  Version: ${result.version}`));
      console.log('');
    } else {
      console.log(chalk.red('\n✗ Tool definition is invalid'));
      console.log('');

      if (result.errors && result.errors.length > 0) {
        console.log(chalk.red(`Found ${result.errors.length} error(s):`));
        for (const error of result.errors) {
          console.log(chalk.red(`  • ${error.message || error}`));
          if (error.path) {
            console.log(chalk.dim(`    Path: ${error.path}`));
          }
        }
      }
      console.log('');
    }
  }
}
