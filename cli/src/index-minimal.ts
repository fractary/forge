/**
 * Minimal CLI test - just commander without SDK imports
 */

import { Command } from 'commander';

export function createMinimalProgram(): Command {
  const program = new Command();

  program
    .name('fractary-forge')
    .description('Command-line interface for Fractary Forge')
    .version('1.0.0');

  // Add a simple test command that doesn't use SDK
  program
    .command('test')
    .description('Test command')
    .action(() => {
      console.log('CLI is working!');
    });

  return program;
}

export async function main(): Promise<void> {
  const program = createMinimalProgram();
  await program.parseAsync(process.argv);
}
