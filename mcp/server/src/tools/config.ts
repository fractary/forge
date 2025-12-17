/**
 * Configuration tools (3 tools)
 *
 * - fractary_forge_config_get: Get specific config value
 * - fractary_forge_config_show: Show full configuration
 * - fractary_forge_config_registry_list: List configured registries
 */

import { z } from 'zod';
import { Registry } from '@fractary/forge';
import { ToolDefinition, formatSuccess, formatError } from '../types.js';

const { configManager } = Registry;

/**
 * Get nested property from object using dot notation
 */
function getNestedProperty(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * fractary_forge_config_get
 */
const configGetSchema = z.object({
  key: z.string().describe('Configuration key (dot notation supported)'),
});

export const configGet: ToolDefinition = {
  name: 'fractary_forge_config_get',
  description: 'Get a specific configuration value by key',
  inputSchema: configGetSchema,
  handler: async (args) => {
    try {
      const result = await configManager.loadConfig();
      const config = result.config;

      const value = getNestedProperty(config, args.key as string);

      return formatSuccess({
        key: args.key,
        value,
        found: value !== undefined,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_config_show
 */
const configShowSchema = z.object({
  scope: z.enum(['local', 'global', 'merged']).default('merged'),
});

export const configShow: ToolDefinition = {
  name: 'fractary_forge_config_show',
  description: 'Show full configuration (local, global, or merged)',
  inputSchema: configShowSchema,
  handler: async (args) => {
    try {
      let config;

      if (args.scope === 'local') {
        config = (await configManager.loadProjectConfig()) || {};
      } else if (args.scope === 'global') {
        config = (await configManager.loadGlobalConfig()) || {};
      } else {
        const result = await configManager.loadConfig();
        config = result.config;
      }

      return formatSuccess({
        config,
        scope: args.scope,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_config_registry_list
 */
const configRegistryListSchema = z.object({});

export const configRegistryList: ToolDefinition = {
  name: 'fractary_forge_config_registry_list',
  description: 'List all configured registries',
  inputSchema: configRegistryListSchema,
  handler: async () => {
    try {
      const result = await configManager.loadConfig();
      const config = result.config;

      const registries = config.registries || [];

      return formatSuccess({
        registries: registries.map((r: any) => ({
          name: r.name,
          url: r.url,
          priority: r.priority,
          enabled: r.enabled !== false,
        })),
        count: registries.length,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * Export all config tools
 */
export const configTools: ToolDefinition[] = [configGet, configShow, configRegistryList];
