/**
 * Forge Configuration Utilities
 *
 * Helper functions for loading and managing Forge configuration.
 * Integrates with @fractary/forge Registry SDK.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type { RegistryForgeConfig as ForgeConfig, RegistryConfig } from '@fractary/forge';

/**
 * Get project-level Forge directory (.fractary/plugins/forge/)
 */
export async function getForgeDir(cwd: string = process.cwd()): Promise<string> {
  return path.join(cwd, '.fractary', 'plugins', 'forge');
}

/**
 * Get global Forge registry directory (~/.fractary/registry/)
 */
export function getGlobalRegistryDir(): string {
  return path.join(os.homedir(), '.fractary', 'registry');
}

/**
 * Get project config path
 */
export async function getProjectConfigPath(cwd: string = process.cwd()): Promise<string> {
  const forgeDir = await getForgeDir(cwd);
  return path.join(forgeDir, 'config.json');
}

/**
 * Get global config path
 */
export function getGlobalConfigPath(): string {
  return path.join(os.homedir(), '.fractary', 'config.json');
}

/**
 * Check if Forge is initialized in current project
 */
export async function isForgeInitialized(cwd: string = process.cwd()): Promise<boolean> {
  const configPath = await getProjectConfigPath(cwd);
  return fs.pathExists(configPath);
}

/**
 * Load Forge configuration from project or global config
 *
 * Returns merged configuration suitable for Registry SDK
 */
export async function loadForgeConfig(cwd: string = process.cwd()): Promise<{
  config: ForgeConfig;
  projectRoot: string;
  configSource: 'project' | 'global' | 'default';
}> {
  const projectRoot = cwd;
  const projectConfigPath = await getProjectConfigPath(cwd);
  const globalConfigPath = getGlobalConfigPath();

  // Try project config first
  if (await fs.pathExists(projectConfigPath)) {
    const config = await fs.readJson(projectConfigPath);
    return {
      config: normalizeConfig(config),
      projectRoot,
      configSource: 'project',
    };
  }

  // Fall back to global config
  if (await fs.pathExists(globalConfigPath)) {
    const config = await fs.readJson(globalConfigPath);
    return {
      config: normalizeConfig(config),
      projectRoot,
      configSource: 'global',
    };
  }

  // Use default config
  return {
    config: getDefaultConfig(),
    projectRoot,
    configSource: 'default',
  };
}

/**
 * Get default Forge configuration
 */
function getDefaultConfig(): ForgeConfig {
  return {
    registries: [
      {
        name: 'fractary',
        type: 'manifest',
        url: 'https://registry.fractary.dev/manifest.json',
        enabled: true,
        priority: 10,
        cache_ttl: 3600,
      },
    ],
  };
}

/**
 * Normalize configuration to match ForgeConfig type
 */
function normalizeConfig(config: any): ForgeConfig {
  // Handle both old and new config formats
  if (config.registries) {
    return config as ForgeConfig;
  }

  // Convert old format to new format
  const registries: RegistryConfig[] = [];

  // Add Stockyard if configured
  if (config.stockyard?.enabled) {
    registries.push({
      name: 'stockyard',
      type: 'manifest',
      url: config.stockyard.url || 'https://stockyard.fractary.dev/manifest.json',
      enabled: true,
      priority: 10,
      cache_ttl: 3600,
    });
  }

  return {
    registries: registries.length > 0 ? registries : getDefaultConfig().registries,
  };
}

/**
 * Save Forge configuration to project config file
 */
export async function saveForgeConfig(
  config: ForgeConfig,
  cwd: string = process.cwd()
): Promise<void> {
  const configPath = await getProjectConfigPath(cwd);
  const forgeDir = path.dirname(configPath);

  // Ensure directory exists
  await fs.ensureDir(forgeDir);

  // Write config
  await fs.writeJson(configPath, config, { spaces: 2 });
}

/**
 * Get registry configuration from environment and config
 */
export async function getRegistryConfig(cwd: string = process.cwd()): Promise<{
  local: {
    enabled: boolean;
    paths: string[];
  };
  global: {
    enabled: boolean;
    path: string;
  };
  remote: {
    enabled: boolean;
    registries: RegistryConfig[];
  };
}> {
  const { config } = await loadForgeConfig(cwd);

  return {
    local: {
      enabled: true,
      paths: [
        path.join(cwd, '.fractary', 'agents'),
        path.join(cwd, '.fractary', 'tools'),
        path.join(cwd, '.fractary', 'workflows'),
        path.join(cwd, '.fractary', 'templates'),
      ],
    },
    global: {
      enabled: true,
      path: getGlobalRegistryDir(),
    },
    remote: {
      enabled: config.registries.length > 0,
      registries: config.registries,
    },
  };
}

/**
 * Get authentication token from environment
 */
export function getAuthToken(): string | undefined {
  return process.env.FRACTARY_TOKEN;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Require authentication, throw if not authenticated
 */
export function requireAuth(): string {
  const token = getAuthToken();
  if (!token) {
    throw new Error(
      'Authentication required. Set FRACTARY_TOKEN environment variable.\\n' +
        'Get your token at: https://stockyard.fractary.dev/settings/tokens'
    );
  }
  return token;
}
