/**
 * Tool registration and exports
 */

import { ToolDefinition } from '../types.js';
import { agentTools } from './agent.js';
import { toolTools } from './tool.js';
import { pluginTools } from './plugin.js';
import { configTools } from './config.js';
import { cacheTools } from './cache.js';
import { forkTools } from './fork.js';

/**
 * All available MCP tools (18 read-focused tools)
 */
export const allTools: ToolDefinition[] = [
  ...agentTools, // 3: list, info, validate
  ...toolTools, // 3: list, info, validate
  ...pluginTools, // 3: list, info, search
  ...configTools, // 3: get, show, registry_list
  ...cacheTools, // 2: stats, clear
  ...forkTools, // 4: list, info, diff, check
];

/**
 * Tool registry for lookup by name
 */
export const toolRegistry = new Map<string, ToolDefinition>(
  allTools.map((tool) => [tool.name, tool])
);

/**
 * Get tool by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

/**
 * List all tool names
 */
export function listTools(): string[] {
  return Array.from(toolRegistry.keys());
}
