/**
 * Plugin query tools (3 tools)
 *
 * - fractary_forge_plugin_list: List installed plugins
 * - fractary_forge_plugin_info: Get plugin details
 * - fractary_forge_plugin_search: Search registry for plugins
 */

import { z } from 'zod';
import { Registry } from '@fractary/forge';
import { ToolDefinition, formatSuccess, formatError, LocationSchema } from '../types.js';

const { localResolver } = Registry;

/**
 * fractary_forge_plugin_list
 */
const pluginListSchema = z.object({
  location: LocationSchema,
});

export const pluginList: ToolDefinition = {
  name: 'fractary_forge_plugin_list',
  description: 'List installed plugins from local, global, or all locations',
  inputSchema: pluginListSchema,
  handler: async (args) => {
    try {
      let components;

      if (args.location === 'local') {
        components = await localResolver.listProject('plugin');
      } else if (args.location === 'global') {
        components = await localResolver.listGlobal('plugin');
      } else {
        components = await localResolver.listAll('plugin');
      }

      // Read plugin manifests
      const plugins = [];
      for (const component of components) {
        try {
          const manifest = await localResolver.readPluginManifest(component);
          plugins.push({
            name: component.name,
            path: component.path,
            location: component.isProject ? 'local' : 'global',
            version: manifest.version,
            description: manifest.description,
          });
        } catch {
          // Skip plugins with invalid manifests
          plugins.push({
            name: component.name,
            path: component.path,
            location: component.isProject ? 'local' : 'global',
            error: 'Failed to read plugin manifest',
          });
        }
      }

      return formatSuccess({
        plugins,
        count: plugins.length,
        location: args.location,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_plugin_info
 */
const pluginInfoSchema = z.object({
  name: z.string().describe('Plugin name or reference'),
});

export const pluginInfo: ToolDefinition = {
  name: 'fractary_forge_plugin_info',
  description: 'Get detailed information about a specific plugin',
  inputSchema: pluginInfoSchema,
  handler: async (args) => {
    try {
      const component = await localResolver.resolve(args.name as string, 'plugin');

      if (!component) {
        return formatError(`Plugin not found: ${args.name}`);
      }

      const manifest = await localResolver.readPluginManifest(component);

      return formatSuccess({
        name: component.name,
        path: component.path,
        location: component.isProject ? 'local' : 'global',
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        homepage: manifest.homepage,
        repository: manifest.repository,
        agents: manifest.agents?.length || 0,
        tools: manifest.tools?.length || 0,
        commands: manifest.commands?.length || 0,
        hooks: manifest.hooks?.length || 0,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_plugin_search
 */
const pluginSearchSchema = z.object({
  query: z.string().describe('Search query'),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().default(20),
});

export const pluginSearch: ToolDefinition = {
  name: 'fractary_forge_plugin_search',
  description: 'Search the Stockyard registry for available plugins',
  inputSchema: pluginSearchSchema,
  handler: async (args) => {
    try {
      // Note: This would require registry manifest search functionality
      // For now, return a placeholder indicating this requires registry API
      return formatSuccess({
        results: [],
        query: args.query,
        message:
          'Plugin search requires Stockyard registry API. Ensure registry is configured and accessible.',
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * Export all plugin tools
 */
export const pluginTools: ToolDefinition[] = [pluginList, pluginInfo, pluginSearch];
