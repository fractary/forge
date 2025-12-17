/**
 * Registry Commands Barrel Export
 *
 * Exports all registry-related commands for plugin management.
 */

import { Command } from 'commander';

// Plugin management commands
export { createInstallCommand } from './install.js';
export { createUninstallCommand } from './uninstall.js';
export { createListCommand } from './list.js';
export { createInfoCommand } from './info.js';
export { createSearchCommand } from './search.js';
export { createLockCommand } from './lock.js';
export { createUpdateCommand } from './update.js';

// Registry management commands
export { createRegistryAddCommand } from './registry-add.js';
export { createRegistryRemoveCommand } from './registry-remove.js';
export { createRegistryListCommand } from './registry-list.js';

// Cache management commands
export { createCacheClearCommand } from './cache-clear.js';
export { createCacheStatsCommand } from './cache-stats.js';

// Fork and merge commands
export { createForkCommand } from './fork.js';
export { createMergeCommand } from './merge.js';

// Authentication commands
export { createLoginCommand } from './login.js';
export { createLogoutCommand } from './logout.js';
export { createWhoamiCommand } from './whoami.js';

// Default exports
import createInstallCommand from './install.js';
import createUninstallCommand from './uninstall.js';
import createListCommand from './list.js';
import createInfoCommand from './info.js';
import createSearchCommand from './search.js';
import createLockCommand from './lock.js';
import createUpdateCommand from './update.js';
import createRegistryAddCommand from './registry-add.js';
import createRegistryRemoveCommand from './registry-remove.js';
import createRegistryListCommand from './registry-list.js';
import createCacheClearCommand from './cache-clear.js';
import createCacheStatsCommand from './cache-stats.js';
import createForkCommand from './fork.js';
import createMergeCommand from './merge.js';
import createLoginCommand from './login.js';
import createLogoutCommand from './logout.js';
import createWhoamiCommand from './whoami.js';

/**
 * Create parent registry command
 */
export function createRegistryCommand(): Command {
  const cmd = new Command('registry');

  cmd
    .description('Manage forge registries')
    .addCommand(createRegistryAddCommand())
    .addCommand(createRegistryRemoveCommand())
    .addCommand(createRegistryListCommand());

  return cmd;
}

/**
 * Create parent cache command
 */
export function createCacheCommand(): Command {
  const cmd = new Command('cache');

  cmd
    .description('Manage manifest cache')
    .addCommand(createCacheClearCommand())
    .addCommand(createCacheStatsCommand());

  return cmd;
}

export default {
  install: createInstallCommand,
  uninstall: createUninstallCommand,
  list: createListCommand,
  info: createInfoCommand,
  search: createSearchCommand,
  lock: createLockCommand,
  update: createUpdateCommand,
  registry: createRegistryCommand,
  cache: createCacheCommand,
};
