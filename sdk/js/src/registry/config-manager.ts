/**
 * Forge Configuration Manager
 *
 * Handles loading, saving, and merging Forge configuration files.
 * Configuration locations:
 * - Project: .fractary/config.json
 * - Global: ~/.fractary/config.json
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import {
  type ForgeConfig,
  type RegistryConfig,
  validateForgeConfig,
  safeValidateForgeConfig,
  mergeWithDefaults,
  DEFAULT_FORGE_CONFIG,
} from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration load result
 */
export interface ConfigLoadResult {
  /** Loaded and merged configuration */
  config: ForgeConfig;
  /** Path to project config (if exists) */
  projectConfigPath: string | null;
  /** Path to global config (if exists) */
  globalConfigPath: string | null;
  /** Whether project config was loaded */
  hasProjectConfig: boolean;
  /** Whether global config was loaded */
  hasGlobalConfig: boolean;
}

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Get project-level config path
 * Looks for .fractary/config.json in current or ancestor directories
 */
export function getProjectConfigPath(cwd: string = process.cwd()): string {
  return path.join(cwd, '.fractary', 'config.json');
}

/**
 * Get global config path
 */
export function getGlobalConfigPath(): string {
  return path.join(os.homedir(), '.fractary', 'config.json');
}

// ============================================================================
// Configuration Manager
// ============================================================================

export class ConfigManager {
  /**
   * Load project config if it exists
   */
  async loadProjectConfig(cwd: string = process.cwd()): Promise<ForgeConfig | null> {
    const configPath = getProjectConfigPath(cwd);

    if (!(await fs.pathExists(configPath))) {
      return null;
    }

    try {
      const data = await fs.readJson(configPath);
      return validateForgeConfig(data);
    } catch (error) {
      throw new Error(
        `Failed to load project config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load global config if it exists
   */
  async loadGlobalConfig(): Promise<ForgeConfig | null> {
    const configPath = getGlobalConfigPath();

    if (!(await fs.pathExists(configPath))) {
      return null;
    }

    try {
      const data = await fs.readJson(configPath);
      return validateForgeConfig(data);
    } catch (error) {
      throw new Error(
        `Failed to load global config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load and merge configurations
   * Priority: project config > global config > defaults
   */
  async loadConfig(cwd: string = process.cwd()): Promise<ConfigLoadResult> {
    const projectConfigPath = getProjectConfigPath(cwd);
    const globalConfigPath = getGlobalConfigPath();

    const projectConfig = await this.loadProjectConfig(cwd);
    const globalConfig = await this.loadGlobalConfig();

    // Project config takes precedence over global config
    let config: ForgeConfig;

    if (projectConfig) {
      // Merge project config with defaults
      config = mergeWithDefaults(projectConfig);
    } else if (globalConfig) {
      // Merge global config with defaults
      config = mergeWithDefaults(globalConfig);
    } else {
      // Use defaults only
      config = DEFAULT_FORGE_CONFIG;
    }

    return {
      config,
      projectConfigPath: projectConfig ? projectConfigPath : null,
      globalConfigPath: globalConfig ? globalConfigPath : null,
      hasProjectConfig: projectConfig !== null,
      hasGlobalConfig: globalConfig !== null,
    };
  }

  /**
   * Save project config
   */
  async saveProjectConfig(config: ForgeConfig, cwd: string = process.cwd()): Promise<void> {
    const configPath = getProjectConfigPath(cwd);
    const configDir = path.dirname(configPath);

    // Ensure directory exists
    await fs.ensureDir(configDir);

    // Validate before saving
    validateForgeConfig(config);

    // Write with formatting
    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  /**
   * Save global config
   */
  async saveGlobalConfig(config: ForgeConfig): Promise<void> {
    const configPath = getGlobalConfigPath();
    const configDir = path.dirname(configPath);

    // Ensure directory exists
    await fs.ensureDir(configDir);

    // Validate before saving
    validateForgeConfig(config);

    // Write with formatting
    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  /**
   * Add registry to configuration
   */
  async addRegistry(
    registry: RegistryConfig,
    scope: 'global' | 'local' = 'local',
    cwd: string = process.cwd()
  ): Promise<void> {
    const result = await this.loadConfig(cwd);
    const config = result.config;

    // Check if registry with same name already exists
    const existingIndex = config.registries.findIndex((r) => r.name === registry.name);

    if (existingIndex >= 0) {
      // Update existing registry
      config.registries[existingIndex] = registry;
    } else {
      // Add new registry
      config.registries.push(registry);
    }

    // Save to appropriate location
    if (scope === 'global') {
      await this.saveGlobalConfig(config);
    } else {
      await this.saveProjectConfig(config, cwd);
    }
  }

  /**
   * Remove registry from configuration
   */
  async removeRegistry(
    registryName: string,
    scope: 'global' | 'local' = 'local',
    cwd: string = process.cwd()
  ): Promise<boolean> {
    const result = await this.loadConfig(cwd);
    const config = result.config;

    const initialLength = config.registries.length;
    config.registries = config.registries.filter((r) => r.name !== registryName);

    const removed = config.registries.length < initialLength;

    if (removed) {
      // Save to appropriate location
      if (scope === 'global') {
        await this.saveGlobalConfig(config);
      } else {
        await this.saveProjectConfig(config, cwd);
      }
    }

    return removed;
  }

  /**
   * Update registry configuration
   */
  async updateRegistry(
    registryName: string,
    updates: Partial<RegistryConfig>,
    scope: 'global' | 'local' = 'local',
    cwd: string = process.cwd()
  ): Promise<boolean> {
    const result = await this.loadConfig(cwd);
    const config = result.config;

    const index = config.registries.findIndex((r) => r.name === registryName);

    if (index === -1) {
      return false;
    }

    // Merge updates with existing config
    config.registries[index] = {
      ...config.registries[index],
      ...updates,
    };

    // Save to appropriate location
    if (scope === 'global') {
      await this.saveGlobalConfig(config);
    } else {
      await this.saveProjectConfig(config, cwd);
    }

    return true;
  }

  /**
   * Get registry by name from current configuration
   */
  async getRegistry(
    registryName: string,
    cwd: string = process.cwd()
  ): Promise<RegistryConfig | null> {
    const result = await this.loadConfig(cwd);
    return result.config.registries.find((r) => r.name === registryName) || null;
  }

  /**
   * Initialize default configuration
   * Creates global config with Fractary registry if no config exists
   */
  async initializeDefaults(): Promise<void> {
    const globalConfigPath = getGlobalConfigPath();

    // Only initialize if no global config exists
    if (await fs.pathExists(globalConfigPath)) {
      return;
    }

    await this.saveGlobalConfig(DEFAULT_FORGE_CONFIG);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default config manager instance
 */
export const configManager = new ConfigManager();
