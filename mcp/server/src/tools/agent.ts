/**
 * Agent query tools (3 tools)
 *
 * - fractary_forge_agent_list: List available agents
 * - fractary_forge_agent_info: Get agent details
 * - fractary_forge_agent_validate: Validate agent definition
 */

import { z } from 'zod';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { Registry, AgentAPI, DefinitionValidator } from '@fractary/forge';
import { ToolDefinition, formatSuccess, formatError, LocationSchema } from '../types.js';

const { localResolver } = Registry;

interface AgentDefinition {
  name: string;
  tags?: string[];
  [key: string]: any;
}

/**
 * fractary_forge_agent_list
 */
const agentListSchema = z.object({
  location: LocationSchema,
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
});

export const agentList: ToolDefinition = {
  name: 'fractary_forge_agent_list',
  description: 'List available agents from local, global, or all locations',
  inputSchema: agentListSchema,
  handler: async (args) => {
    try {
      let components;

      if (args.location === 'local') {
        components = await localResolver.listProject('agent');
      } else if (args.location === 'global') {
        components = await localResolver.listGlobal('agent');
      } else {
        components = await localResolver.listAll('agent');
      }

      // Filter by tags if specified
      if (args.tags && (args.tags as string[]).length > 0) {
        // Read each component to check tags
        const filtered = [];
        for (const component of components) {
          try {
            const content = await localResolver.read(component);
            const definition = yaml.load(content) as AgentDefinition;
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

      const agents = components.map((c) => ({
        name: c.name,
        path: c.path,
        location: c.isProject ? 'local' : 'global',
        plugin: c.plugin,
      }));

      return formatSuccess({
        agents,
        count: agents.length,
        location: args.location,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_agent_info
 */
const agentInfoSchema = z.object({
  name: z.string().describe('Agent name or reference'),
});

export const agentInfo: ToolDefinition = {
  name: 'fractary_forge_agent_info',
  description: 'Get detailed information about a specific agent',
  inputSchema: agentInfoSchema,
  handler: async (args) => {
    try {
      const agentAPI = new AgentAPI();
      const info = await agentAPI.agentInfoGet(args.name as string);

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
 * fractary_forge_agent_validate
 */
const agentValidateSchema = z.object({
  path: z.string().describe('Path to agent definition file'),
});

export const agentValidate: ToolDefinition = {
  name: 'fractary_forge_agent_validate',
  description: 'Validate an agent definition file against the schema',
  inputSchema: agentValidateSchema,
  handler: async (args) => {
    try {
      // Read file
      const content = await fs.readFile(args.path as string, 'utf-8');
      const data = yaml.load(content) as unknown;

      // Validate
      const validator = new DefinitionValidator();
      const result = validator.validateAgentSafe(data);

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
 * Export all agent tools
 */
export const agentTools: ToolDefinition[] = [agentList, agentInfo, agentValidate];
