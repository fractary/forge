/**
 * Tool adapter interface and types
 */

import type { ToolDefinition } from '../../schemas';

/**
 * Unified tool adapter interface
 * Tools are defined once in YAML and adapted to each provider's format
 */
export interface IToolAdapter {
  provider: string;
  adaptTool(tool: ToolDefinition): any;
}
