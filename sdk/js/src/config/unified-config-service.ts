/**
 * Unified Configuration Service
 *
 * Manages reading/writing the unified config file (.fractary/config.yaml)
 * with support for the `forge:` section.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { ForgeSectionConfig } from './forge-section';
import {
  FORGE_CONFIG_SCHEMA_VERSION,
  getDefaultForgeConfig,
  validateForgeConfig,
  safeValidateForgeConfig,
  mergeWithDefaults,
} from './forge-section';

// ============================================================================
// Constants
// ============================================================================

/** Name of the Fractary config directory */
const FRACTARY_DIR = '.fractary';

/** Name of the unified config file */
const CONFIG_FILE = 'config.yaml';

/** Old forge config path (for migration) */
const OLD_FORGE_CONFIG_PATH = '.fractary/forge/config.yaml';

// Re-export the schema version constant from forge-section
export { FORGE_CONFIG_SCHEMA_VERSION } from './forge-section';

// ============================================================================
// Types
// ============================================================================

/**
 * Unified config structure with all plugin sections
 */
export interface UnifiedConfig {
  version?: string;
  work?: Record<string, unknown>;
  repo?: Record<string, unknown>;
  logs?: Record<string, unknown>;
  file?: Record<string, unknown>;
  spec?: Record<string, unknown>;
  docs?: Record<string, unknown>;
  codex?: Record<string, unknown>;
  forge?: ForgeSectionConfig;
  [key: string]: unknown;
}

/**
 * Result of loading unified config
 */
export interface LoadConfigResult {
  config: UnifiedConfig;
  path: string;
  exists: boolean;
}

/**
 * Migration result
 */
export interface MigrationResult {
  migrated: boolean;
  backupPath?: string;
  oldConfigPath?: string;
}

// ============================================================================
// Environment Variable Resolution
// ============================================================================

/**
 * Options for environment variable resolution
 */
export interface ResolveEnvVarsOptions {
  /** Log a warning when an environment variable is not set */
  warnOnMissing?: boolean;
  /** Throw an error when an environment variable is not set */
  throwOnMissing?: boolean;
  /** Custom logger for warnings */
  logger?: { warn: (message: string) => void };
}

/**
 * Resolve environment variables in a string
 * Supports ${VAR_NAME} syntax
 *
 * @param value - String containing ${VAR_NAME} placeholders
 * @param options - Resolution options
 * @returns String with environment variables resolved
 */
export function resolveEnvVars(value: string, options?: ResolveEnvVarsOptions): string {
  const { warnOnMissing = false, throwOnMissing = false, logger = console } = options || {};

  return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const resolved = process.env[varName];

    if (resolved === undefined) {
      if (throwOnMissing) {
        throw new Error(`Environment variable ${varName} is not set`);
      }
      if (warnOnMissing) {
        logger.warn(`Environment variable ${varName} is not set, using empty string`);
      }
      return '';
    }

    return resolved;
  });
}

/**
 * Resolve environment variables recursively in a config object
 *
 * @param config - Config object with potential ${VAR_NAME} placeholders
 * @param options - Resolution options
 * @returns Config object with environment variables resolved
 */
export function resolveEnvVarsInConfig<T>(config: T, options?: ResolveEnvVarsOptions): T {
  if (typeof config === 'string') {
    return resolveEnvVars(config, options) as unknown as T;
  }

  if (Array.isArray(config)) {
    return config.map((item) => resolveEnvVarsInConfig(item, options)) as unknown as T;
  }

  if (config !== null && typeof config === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      resolved[key] = resolveEnvVarsInConfig(value, options);
    }
    return resolved as T;
  }

  return config;
}

// ============================================================================
// Project Root Discovery
// ============================================================================

/**
 * Find the project root by looking for .fractary or .git directory
 *
 * @param startDir - Directory to start searching from (default: cwd)
 * @returns Path to project root or null if not found
 */
export async function findProjectRoot(startDir?: string): Promise<string | null> {
  let dir = startDir || process.cwd();
  const root = path.parse(dir).root;

  while (dir !== root) {
    // Check for .fractary directory
    try {
      const fractaryPath = path.join(dir, FRACTARY_DIR);
      const stat = await fs.stat(fractaryPath);
      if (stat.isDirectory()) {
        return dir;
      }
    } catch {
      // Not found, continue
    }

    // Check for .git directory as fallback
    try {
      const gitPath = path.join(dir, '.git');
      const stat = await fs.stat(gitPath);
      if (stat.isDirectory()) {
        return dir;
      }
    } catch {
      // Not found, continue
    }

    // Move up one level
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

/**
 * Get the path to the unified config file
 *
 * @param projectRoot - Project root directory
 * @returns Path to .fractary/config.yaml
 */
export function getUnifiedConfigPath(projectRoot: string): string {
  return path.join(projectRoot, FRACTARY_DIR, CONFIG_FILE);
}

/**
 * Get the path to the old forge config file (for migration)
 *
 * @param projectRoot - Project root directory
 * @returns Path to .fractary/forge/config.yaml
 */
export function getOldForgeConfigPath(projectRoot: string): string {
  return path.join(projectRoot, OLD_FORGE_CONFIG_PATH);
}

// ============================================================================
// Config Loading
// ============================================================================

/**
 * Check if the unified config file exists
 *
 * @param projectRoot - Project root directory
 * @returns True if .fractary/config.yaml exists
 */
export async function unifiedConfigExists(projectRoot: string): Promise<boolean> {
  try {
    await fs.access(getUnifiedConfigPath(projectRoot));
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the forge section exists in unified config
 *
 * @param projectRoot - Project root directory
 * @returns True if forge: section exists
 */
export async function forgeConfigExists(projectRoot: string): Promise<boolean> {
  try {
    const config = await loadUnifiedConfig(projectRoot);
    return config.forge !== undefined;
  } catch {
    return false;
  }
}

/**
 * Check if old forge config exists (for migration)
 *
 * @param projectRoot - Project root directory
 * @returns True if .fractary/forge/config.yaml exists
 */
export async function oldForgeConfigExists(projectRoot: string): Promise<boolean> {
  try {
    await fs.access(getOldForgeConfigPath(projectRoot));
    return true;
  } catch {
    return false;
  }
}

/**
 * Load the unified config file
 *
 * @param projectRoot - Project root directory
 * @returns Parsed unified config
 * @throws Error if config file doesn't exist or is invalid
 */
export async function loadUnifiedConfig(projectRoot: string): Promise<UnifiedConfig> {
  const configPath = getUnifiedConfigPath(projectRoot);

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = yaml.load(content) as UnifiedConfig;

    if (!config || typeof config !== 'object') {
      throw new Error('Invalid config format: expected an object');
    }

    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Unified config not found at ${configPath}`);
    }
    throw new Error(`Failed to load unified config: ${(error as Error).message}`);
  }
}

/**
 * Load the forge section from unified config
 *
 * @param projectRoot - Project root directory
 * @param resolveEnv - Whether to resolve environment variables (default: true)
 * @returns Validated forge section config
 * @throws Error if forge section doesn't exist or is invalid
 */
export async function loadForgeSection(
  projectRoot: string,
  resolveEnv = true
): Promise<ForgeSectionConfig> {
  const config = await loadUnifiedConfig(projectRoot);

  if (!config.forge) {
    throw new Error(
      'Forge section not found in unified config. Run "fractary-forge configure" to initialize.'
    );
  }

  // Optionally resolve environment variables
  const forgeConfig = resolveEnv ? resolveEnvVarsInConfig(config.forge) : config.forge;

  // Validate and return
  return validateForgeConfig(forgeConfig);
}

/**
 * Safely load the forge section, returning null if it doesn't exist
 *
 * @param projectRoot - Project root directory
 * @param resolveEnv - Whether to resolve environment variables (default: true)
 * @returns Forge config or null if not found
 */
export async function safeLoadForgeSection(
  projectRoot: string,
  resolveEnv = true
): Promise<ForgeSectionConfig | null> {
  try {
    return await loadForgeSection(projectRoot, resolveEnv);
  } catch {
    return null;
  }
}

// ============================================================================
// Config Saving
// ============================================================================

/**
 * Save the unified config file
 *
 * @param projectRoot - Project root directory
 * @param config - Config to save
 */
export async function saveUnifiedConfig(
  projectRoot: string,
  config: UnifiedConfig
): Promise<void> {
  const configPath = getUnifiedConfigPath(projectRoot);
  const configDir = path.dirname(configPath);

  // Ensure .fractary directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Write config with nice formatting
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
    sortKeys: false,
  });

  await fs.writeFile(configPath, content, 'utf-8');
}

/**
 * Save only the forge section, preserving other sections
 *
 * @param projectRoot - Project root directory
 * @param forgeConfig - Forge config to save
 */
export async function saveForgeSection(
  projectRoot: string,
  forgeConfig: ForgeSectionConfig
): Promise<void> {
  let config: UnifiedConfig;

  try {
    config = await loadUnifiedConfig(projectRoot);
  } catch {
    // Config doesn't exist, create new one
    config = {
      version: FORGE_CONFIG_SCHEMA_VERSION,
    };
  }

  // Update forge section
  config.forge = forgeConfig;

  await saveUnifiedConfig(projectRoot, config);
}

/**
 * Update the forge section with partial config, merging with existing values
 *
 * @param projectRoot - Project root directory
 * @param partial - Partial forge config to merge
 */
export async function updateForgeSection(
  projectRoot: string,
  partial: Partial<ForgeSectionConfig>
): Promise<ForgeSectionConfig> {
  let existingConfig: ForgeSectionConfig | null = null;

  try {
    existingConfig = await loadForgeSection(projectRoot, false);
  } catch {
    // No existing config, will use defaults
  }

  const organization = partial.organization || existingConfig?.organization || 'default';
  const mergedConfig = mergeWithDefaults(
    {
      ...existingConfig,
      ...partial,
    },
    organization
  );

  await saveForgeSection(projectRoot, mergedConfig);
  return mergedConfig;
}

// ============================================================================
// Migration
// ============================================================================

/**
 * Migrate old forge config to unified config
 *
 * @param projectRoot - Project root directory
 * @returns Migration result
 */
export async function migrateOldForgeConfig(projectRoot: string): Promise<MigrationResult> {
  const oldConfigPath = getOldForgeConfigPath(projectRoot);

  // Check if old config exists
  const oldExists = await oldForgeConfigExists(projectRoot);
  if (!oldExists) {
    return { migrated: false };
  }

  // Load old config
  let oldConfig: Record<string, unknown>;
  try {
    const content = await fs.readFile(oldConfigPath, 'utf-8');
    oldConfig = yaml.load(content) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Failed to read old config: ${(error as Error).message}`);
  }

  // Convert to forge section format
  // The old config is essentially the same structure, just needs schema_version
  const forgeConfig: ForgeSectionConfig = {
    schema_version: '2.0',
    organization: (oldConfig.organization as string) || 'default',
    registry: (oldConfig.registry as ForgeSectionConfig['registry']) || undefined,
    lockfile: (oldConfig.lockfile as ForgeSectionConfig['lockfile']) || undefined,
    updates: (oldConfig.updates as ForgeSectionConfig['updates']) || undefined,
    defaults: (oldConfig.defaults as ForgeSectionConfig['defaults']) || undefined,
    features: (oldConfig.features as ForgeSectionConfig['features']) || { telemetry: false },
  } as ForgeSectionConfig;

  // Validate the converted config
  const validation = safeValidateForgeConfig(forgeConfig);
  if (!validation.success) {
    throw new Error(
      `Invalid old config format: ${validation.errors?.map((e) => e.message).join(', ')}`
    );
  }

  // Save to unified config
  await saveForgeSection(projectRoot, validation.data!);

  // Create backup of old config
  const backupPath = `${oldConfigPath}.backup.${Date.now()}`;
  await fs.copyFile(oldConfigPath, backupPath);

  return {
    migrated: true,
    backupPath,
    oldConfigPath,
  };
}

/**
 * Check if migration is needed
 *
 * @param projectRoot - Project root directory
 * @returns True if old config exists but forge section doesn't
 */
export async function needsMigration(projectRoot: string): Promise<boolean> {
  const hasOldConfig = await oldForgeConfigExists(projectRoot);
  const hasForgeSection = await forgeConfigExists(projectRoot);

  return hasOldConfig && !hasForgeSection;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize forge configuration in unified config
 *
 * @param projectRoot - Project root directory
 * @param organization - Organization slug
 * @param options - Initialization options
 * @returns Created forge config
 */
export async function initializeForgeConfig(
  projectRoot: string,
  organization: string,
  options: {
    force?: boolean;
    initGlobal?: boolean;
  } = {}
): Promise<ForgeSectionConfig> {
  const { force = false, initGlobal = false } = options;

  // Check if already exists
  const exists = await forgeConfigExists(projectRoot);
  if (exists && !force) {
    throw new Error(
      'Forge configuration already exists. Use --force to overwrite.'
    );
  }

  // Create default config
  const forgeConfig = getDefaultForgeConfig(organization);

  // Save to unified config
  await saveForgeSection(projectRoot, forgeConfig);

  // Create directory structure
  await ensureDirectoryStructure(projectRoot, forgeConfig);

  // Initialize global registry if requested
  if (initGlobal) {
    await initializeGlobalRegistry();
  }

  return forgeConfig;
}

/**
 * Ensure required directories exist
 */
async function ensureDirectoryStructure(
  projectRoot: string,
  config: ForgeSectionConfig
): Promise<void> {
  const dirs = [
    path.join(projectRoot, config.registry.local.agents_path),
    path.join(projectRoot, config.registry.local.tools_path),
    path.join(projectRoot, '.fractary', 'forge'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Initialize global registry directory
 */
async function initializeGlobalRegistry(): Promise<void> {
  const os = await import('os');
  const globalDir = path.join(os.homedir(), '.fractary', 'registry');

  await fs.mkdir(path.join(globalDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(globalDir, 'tools'), { recursive: true });
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate forge configuration in unified config
 *
 * @param projectRoot - Project root directory
 * @returns Validation result
 */
export async function validateForgeConfiguration(
  projectRoot: string
): Promise<{
  valid: boolean;
  config?: ForgeSectionConfig;
  errors?: Array<{ path: string; message: string }>;
}> {
  try {
    const config = await loadUnifiedConfig(projectRoot);

    if (!config.forge) {
      return {
        valid: false,
        errors: [{ path: 'forge', message: 'Forge section not found' }],
      };
    }

    const result = safeValidateForgeConfig(config.forge);

    if (result.success) {
      return {
        valid: true,
        config: result.data,
      };
    }

    return {
      valid: false,
      errors: result.errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{ path: '', message: (error as Error).message }],
    };
  }
}

// ============================================================================
// Dry Run Support
// ============================================================================

/**
 * Preview what configuration would be created without writing
 *
 * @param projectRoot - Project root directory
 * @param organization - Organization slug
 * @returns Preview of config that would be created
 */
export function previewForgeConfig(
  projectRoot: string,
  organization: string
): {
  forgeConfig: ForgeSectionConfig;
  configPath: string;
  directories: string[];
} {
  const forgeConfig = getDefaultForgeConfig(organization);
  const configPath = getUnifiedConfigPath(projectRoot);

  const directories = [
    path.join(projectRoot, forgeConfig.registry.local.agents_path),
    path.join(projectRoot, forgeConfig.registry.local.tools_path),
    path.join(projectRoot, '.fractary', 'forge'),
  ];

  return {
    forgeConfig,
    configPath,
    directories,
  };
}
