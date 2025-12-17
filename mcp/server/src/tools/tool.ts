/**
 * Tool query tools (3 tools)
 *
 * - fractary_forge_tool_list: List available tools
 * - fractary_forge_tool_info: Get tool details
 * - fractary_forge_tool_validate: Validate tool definition
 */

import { z } from 'zod';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { Registry, ToolAPI, DefinitionValidator } from '@fractary/forge';
import { ToolDefinition, formatSuccess, formatError, LocationSchema } from '../types.js';

const { localResolver } = Registry;

interface ToolDefYaml {
  name: string;
  tags?: string[];
  [key: string]: any;
}

/**
 * fractary_forge_tool_list
 */
const toolListSchema = z.object({
  location: LocationSchema,
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
});

export const toolList: ToolDefinition = {
  name: 'fractary_forge_tool_list',
  description: 'List available tools from local, global, or all locations',
  inputSchema: toolListSchema,
  handler: async (args) => {
    try {
      let components;

      if (args.location === 'local') {
        components = await localResolver.listProject('tool');
      } else if (args.location === 'global') {
        components = await localResolver.listGlobal('tool');
      } else {
        components = await localResolver.listAll('tool');
      }

      // Filter by tags if specified
      if (args.tags && (args.tags as string[]).length > 0) {
        const filtered = [];
        for (const component of components) {
          try {
            const content = await localResolver.read(component);
            const definition = yaml.load(content) as ToolDefYaml;
            const componentTags = definition.tags || [];
            if ((args.tags as string[]).some((tag) => componentTags.includes(tag))) {
              filtered.push(component);
            }
          } catch {
            // Skip components that can't be read
          }
        }
        components = filtered;
      }

      // Apply limit
      if (args.limit !== undefined) {
        components = components.slice(0, args.limit as number);
      }

      const tools = components.map((c) => ({
        name: c.name,
        path: c.path,
        location: c.isProject ? 'local' : 'global',
        plugin: c.plugin,
      }));

      return formatSuccess({
        tools,
        count: tools.length,
        location: args.location,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_tool_info
 */
const toolInfoSchema = z.object({
  name: z.string().describe('Tool name or reference'),
});

export const toolInfo: ToolDefinition = {
  name: 'fractary_forge_tool_info',
  description: 'Get detailed information about a specific tool',
  inputSchema: toolInfoSchema,
  handler: async (args) => {
    try {
      const toolAPI = new ToolAPI();
      const info = await toolAPI.toolInfoGet(args.name as string);

      return formatSuccess({
        name: info.name,
        version: info.version,
        description: info.description,
        tags: info.tags,
        author: info.author,
        source: info.source,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_tool_validate
 */
const toolValidateSchema = z.object({
  path: z.string().describe('Path to tool definition file'),
});

export const toolValidate: ToolDefinition = {
  name: 'fractary_forge_tool_validate',
  description: 'Validate a tool definition file against the schema',
  inputSchema: toolValidateSchema,
  handler: async (args) => {
    try {
      // Read file
      const content = await fs.readFile(args.path as string, 'utf-8');
      const data = yaml.load(content) as unknown;

      // Validate
      const validator = new DefinitionValidator();
      const result = validator.validateToolSafe(data);

      if (result.success) {
        return formatSuccess({
          valid: true,
          path: args.path,
          definition: result.data,
        });
      } else {
        return formatSuccess({
          valid: false,
          path: args.path,
          error: result.error,
        });
      }
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * Export all tool tools
 */
export const toolTools: ToolDefinition[] = [toolList, toolInfo, toolValidate];
