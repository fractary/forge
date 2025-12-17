/**
 * Forge Configuration Migration and I/O
 *
 * Handles reading/writing YAML configuration files
 */

import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import type { ForgeYamlConfig } from './config-types.js';
import { resolveEnvVarsInConfig, getDefaultYamlConfig } from './config-types.js';

/**
 * Read YAML configuration file
 */
export async function readYamlConfig(configPath: string): Promise<ForgeYamlConfig> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = yaml.load(content) as ForgeYamlConfig;

    // Resolve environment variables
    const resolved = resolveEnvVarsInConfig(config) as ForgeYamlConfig;

    return resolved;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    throw new Error(`Failed to read configuration: ${(error as Error).message}`);
  }
}

/**
 * Write YAML configuration file
 */
export async function writeYamlConfig(
  configPath: string,
  config: ForgeYamlConfig
): Promise<void> {
  try {
    const content = yaml.dump(config, {
      indent: 2,
      lineWidth: 100,
      noRefs: true,
    });

    await fs.writeFile(configPath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write configuration: ${(error as Error).message}`);
  }
}

/**
 * Check if configuration file exists
 */
export async function configExists(configPath: string): Promise<boolean> {
  try {
    await fs.access(configPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create default configuration
 */
export async function createDefaultConfig(
  configPath: string,
  organization: string
): Promise<ForgeYamlConfig> {
  const config = getDefaultYamlConfig(organization);
  await writeYamlConfig(configPath, config);
  return config;
}

export { getDefaultYamlConfig };
