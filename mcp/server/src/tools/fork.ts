/**
 * Fork query tools (4 tools)
 *
 * - fractary_forge_fork_list: List forked assets
 * - fractary_forge_fork_info: Get fork details
 * - fractary_forge_fork_diff: Show diff from upstream
 * - fractary_forge_fork_check: Check for upstream updates
 */

import { z } from 'zod';
import * as yaml from 'js-yaml';
import { Registry } from '@fractary/forge';
import { ToolDefinition, formatSuccess, formatError, LocationSchema } from '../types.js';

const { localResolver } = Registry;

type ComponentType = 'agent' | 'tool' | 'plugin';

/**
 * fractary_forge_fork_list
 */
const forkListSchema = z.object({
  location: LocationSchema,
  type: z.enum(['agent', 'tool', 'plugin']).optional(),
});

export const forkList: ToolDefinition = {
  name: 'fractary_forge_fork_list',
  description: 'List all forked assets (agents, tools, plugins)',
  inputSchema: forkListSchema,
  handler: async (args) => {
    try {
      const types: ComponentType[] = args.type
        ? [args.type as ComponentType]
        : ['agent', 'tool', 'plugin'];

      const forks = [];

      for (const type of types) {
        let components;

        if (args.location === 'local') {
          components = await localResolver.listProject(type);
        } else if (args.location === 'global') {
          components = await localResolver.listGlobal(type);
        } else {
          components = await localResolver.listAll(type);
        }

        // Check each component for fork metadata
        for (const component of components) {
          try {
            if (type === 'plugin') {
              const manifest = await localResolver.readPluginManifest(component);
              if (manifest.fork) {
                forks.push({
                  name: component.name,
                  type,
                  location: component.isProject ? 'local' : 'global',
                  fork: manifest.fork,
                });
              }
            } else {
              const content = await localResolver.read(component);
              const definition: any = yaml.load(content);
              if (definition.fork) {
                forks.push({
                  name: component.name,
                  type,
                  location: component.isProject ? 'local' : 'global',
                  fork: definition.fork,
                });
              }
            }
          } catch {
            // Skip components that can't be read
          }
        }
      }

      return formatSuccess({
        forks,
        count: forks.length,
        location: args.location,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_fork_info
 */
const forkInfoSchema = z.object({
  name: z.string().describe('Asset name or reference'),
  type: z.enum(['agent', 'tool', 'plugin']),
});

export const forkInfo: ToolDefinition = {
  name: 'fractary_forge_fork_info',
  description: 'Get detailed information about a forked asset',
  inputSchema: forkInfoSchema,
  handler: async (args) => {
    try {
      const component = await localResolver.resolve(args.name as string, args.type as ComponentType);

      if (!component) {
        return formatError(`${args.type} not found: ${args.name}`);
      }

      let forkMetadata;
      if (args.type === 'plugin') {
        const manifest = await localResolver.readPluginManifest(component);
        forkMetadata = manifest.fork;
      } else {
        const content = await localResolver.read(component);
        const definition: any = yaml.load(content);
        forkMetadata = definition.fork;
      }

      if (!forkMetadata) {
        return formatSuccess({
          name: args.name,
          type: args.type,
          isFork: false,
          message: 'This asset is not a fork',
        });
      }

      return formatSuccess({
        name: args.name,
        type: args.type,
        isFork: true,
        upstream: forkMetadata.upstream,
        upstreamVersion: forkMetadata.upstreamVersion,
        forkedAt: forkMetadata.forkedAt,
        localChanges: forkMetadata.localChanges !== false,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_fork_diff
 */
const forkDiffSchema = z.object({
  name: z.string().describe('Asset name or reference'),
  type: z.enum(['agent', 'tool', 'plugin']),
});

export const forkDiff: ToolDefinition = {
  name: 'fractary_forge_fork_diff',
  description: 'Show differences between local fork and upstream version',
  inputSchema: forkDiffSchema,
  handler: async (args) => {
    try {
      return formatSuccess({
        name: args.name,
        type: args.type,
        message:
          'Fork diff requires fetching upstream version and comparing. This requires registry access and will be implemented in a future update.',
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_fork_check
 */
const forkCheckSchema = z.object({
  name: z.string().describe('Asset name or reference'),
  type: z.enum(['agent', 'tool', 'plugin']),
});

export const forkCheck: ToolDefinition = {
  name: 'fractary_forge_fork_check',
  description: 'Check if upstream version has updates available',
  inputSchema: forkCheckSchema,
  handler: async (args) => {
    try {
      const component = await localResolver.resolve(args.name as string, args.type as ComponentType);

      if (!component) {
        return formatError(`${args.type} not found: ${args.name}`);
      }

      let forkMetadata;
      if (args.type === 'plugin') {
        const manifest = await localResolver.readPluginManifest(component);
        forkMetadata = manifest.fork;
      } else {
        const content = await localResolver.read(component);
        const definition: any = yaml.load(content);
        forkMetadata = definition.fork;
      }

      if (!forkMetadata) {
        return formatSuccess({
          name: args.name,
          type: args.type,
          isFork: false,
          message: 'This asset is not a fork',
        });
      }

      return formatSuccess({
        name: args.name,
        type: args.type,
        localVersion: forkMetadata.upstreamVersion,
        message:
          'Checking for upstream updates requires registry access. This will be implemented in a future update.',
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * Export all fork tools
 */
export const forkTools: ToolDefinition[] = [forkList, forkInfo, forkDiff, forkCheck];
