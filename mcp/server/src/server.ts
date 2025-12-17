/**
 * MCP Server implementation for Fractary Forge
 *
 * Exposes read-focused operations for agents, tools, plugins, config, cache, and forks.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { allTools, getTool } from './tools/index.js';
import { formatError } from './types.js';

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'fractary-forge',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: 'object',
          properties: {},
          ...tool.inputSchema._def,
        },
      })),
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = getTool(toolName);

    if (!tool) {
      const error = formatError(`Unknown tool: ${toolName}`);
      return {
        content: error.content,
        isError: error.isError,
      };
    }

    try {
      // Validate input using Zod schema
      const validatedArgs = tool.inputSchema.parse(request.params.arguments || {});

      // Execute tool handler
      const result = await tool.handler(validatedArgs);
      return {
        content: result.content,
        isError: result.isError,
      };
    } catch (error) {
      const errorResult = formatError(error);
      return {
        content: errorResult.content,
        isError: errorResult.isError,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}
