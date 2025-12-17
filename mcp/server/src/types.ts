/**
 * Shared type definitions for the Forge MCP server
 */

import { z } from 'zod';

/**
 * Tool handler function type
 */
export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

/**
 * Tool definition interface
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: ToolHandler;
}

/**
 * Tool result type
 */
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Common filter options for list operations
 */
export const FilterSchema = z.object({
  type: z.enum(['agent', 'tool', 'plugin']).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
});

export type FilterOptions = z.infer<typeof FilterSchema>;

/**
 * Location options for resolution
 */
export const LocationSchema = z.enum(['local', 'global', 'all']).default('all');
export type LocationType = z.infer<typeof LocationSchema>;

/**
 * Format success response
 */
export function formatSuccess(data: unknown): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Format error response
 */
export function formatError(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}
