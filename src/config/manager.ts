/**
 * Configuration manager for Forge SDK
 */

import path from 'path';
import os from 'os';
import { readJson, writeJson, exists, joinPath } from '../fs';
import { logger } from '../logger';
import { ForgeError, ErrorCode } from '../errors';
import type { ForgeConfig, ProjectConfig } from '../types';
import { getDefaultGlobalConfig } from './defaults';

export class ConfigManager {
  private globalConfig: ForgeConfig | null = null;
  private projectConfig: ProjectConfig | null = null;
  private configPath: string;

  constructor() {
    this.configPath = this.getGlobalConfigPath();
  }

  private getGlobalConfigPath(): string {
    return path.join(os.homedir(), '.forge', 'config.json');
  }

  private getProjectConfigPath(projectDir?: string): string {
    const dir = projectDir || process.cwd();
    return path.join(dir, '.forge', 'project.json');
  }

  async loadGlobalConfig(): Promise<ForgeConfig> {
    if (this.globalConfig) {
      return this.globalConfig;
    }

    try {
      if (await exists(this.configPath)) {
        this.globalConfig = await readJson<ForgeConfig>(this.configPath);
        logger.debug(`Loaded global config from: ${this.configPath}`);
      } else {
        this.globalConfig = getDefaultGlobalConfig();
        logger.debug('Using default global configuration');
      }

      // Merge with environment variables
      this.mergeEnvironmentVariables();

      return this.globalConfig;
    } catch (error) {
      throw new ForgeError(ErrorCode.INVALID_CONFIG, 'Failed to load global configuration', error);
    }
  }

  async saveGlobalConfig(config: ForgeConfig): Promise<void> {
    try {
      await writeJson(this.configPath, config, { spaces: 2 });
      this.globalConfig = config;
      logger.debug(`Saved global config to: ${this.configPath}`);
    } catch (error) {
      throw new ForgeError(ErrorCode.UNKNOWN, 'Failed to save global configuration', error);
    }
  }

  async loadProjectConfig(projectDir?: string): Promise<ProjectConfig | null> {
    const configPath = this.getProjectConfigPath(projectDir);

    try {
      if (await exists(configPath)) {
        this.projectConfig = await readJson<ProjectConfig>(configPath);
        logger.debug(`Loaded project config from: ${configPath}`);
        return this.projectConfig;
      }
      return null;
    } catch (error) {
      throw new ForgeError(ErrorCode.INVALID_CONFIG, 'Failed to load project configuration', error);
    }
  }

  async saveProjectConfig(config: ProjectConfig, projectDir?: string): Promise<void> {
    const configPath = this.getProjectConfigPath(projectDir);

    try {
      await writeJson(configPath, config, { spaces: 2 });
      this.projectConfig = config;
      logger.debug(`Saved project config to: ${configPath}`);
    } catch (error) {
      throw new ForgeError(ErrorCode.UNKNOWN, 'Failed to save project configuration', error);
    }
  }

  private mergeEnvironmentVariables(): void {
    if (!this.globalConfig) return;

    // GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN || process.env.FORGE_GITHUB_TOKEN;
    if (githubToken) {
      this.globalConfig.resolvers = this.globalConfig.resolvers || {};
      this.globalConfig.resolvers.github = this.globalConfig.resolvers.github || {};
      this.globalConfig.resolvers.github.token = githubToken;
    }

    // GitHub default org
    const defaultOrg = process.env.FORGE_DEFAULT_ORG;
    if (defaultOrg) {
      this.globalConfig.resolvers = this.globalConfig.resolvers || {};
      this.globalConfig.resolvers.github = this.globalConfig.resolvers.github || {};
      this.globalConfig.resolvers.github.defaultOrg = defaultOrg;
    }

    // Feature flags
    if (process.env.FORGE_TELEMETRY !== undefined) {
      this.globalConfig.features = this.globalConfig.features || {};
      this.globalConfig.features.telemetry = process.env.FORGE_TELEMETRY === 'true';
    }

    if (process.env.FORGE_UPDATE_CHECK !== undefined) {
      this.globalConfig.features = this.globalConfig.features || {};
      this.globalConfig.features.updateCheck = process.env.FORGE_UPDATE_CHECK === 'true';
    }

    // Paths
    if (process.env.FORGE_CACHE_DIR) {
      this.globalConfig.paths = this.globalConfig.paths || {};
      this.globalConfig.paths.cache = process.env.FORGE_CACHE_DIR;
      if (this.globalConfig.cache) {
        this.globalConfig.cache.dir = process.env.FORGE_CACHE_DIR;
      }
    }

    if (process.env.FORGE_TEMPLATES_DIR) {
      this.globalConfig.paths = this.globalConfig.paths || {};
      this.globalConfig.paths.templates = process.env.FORGE_TEMPLATES_DIR;
    }
  }

  getCachePath(...segments: string[]): string {
    const config = this.globalConfig || getDefaultGlobalConfig();
    return joinPath(config.paths?.cache || '', ...segments);
  }

  getTemplatesPath(...segments: string[]): string {
    const config = this.globalConfig || getDefaultGlobalConfig();
    return joinPath(config.paths?.templates || '', ...segments);
  }

  isFeatureEnabled(feature: keyof NonNullable<ForgeConfig['features']>): boolean {
    const config = this.globalConfig || getDefaultGlobalConfig();
    return config.features?.[feature] ?? false;
  }

  /**
   * Get the current global config (cached or default)
   */
  getGlobalConfig(): ForgeConfig {
    return this.globalConfig || getDefaultGlobalConfig();
  }

  /**
   * Get the current project config (cached or null)
   */
  getProjectConfig(): ProjectConfig | null {
    return this.projectConfig;
  }

  /**
   * Reset cached configurations
   */
  reset(): void {
    this.globalConfig = null;
    this.projectConfig = null;
  }
}

// Default singleton instance
export const configManager = new ConfigManager();

// Helper function to load config with defaults
export async function loadConfig(): Promise<ForgeConfig> {
  return await configManager.loadGlobalConfig();
}
