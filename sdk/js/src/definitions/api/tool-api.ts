/**
 * Public Tool API
 */

import { logger } from '../../logger';
import { isForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import { DefinitionResolver } from '../registry/resolver';
import { ToolExecutor } from '../executor/tool-executor';
import type { ToolResult, ToolExecutionOptions } from '../executor/types';

export interface ToolInfo {
  name: string;
  version: string;
  description: string;
  tags: string[];
  author?: string;
  source: 'local' | 'global' | 'stockyard';
}

export class ToolAPI {
  private resolver: DefinitionResolver;
  private executor: ToolExecutor;

  constructor(config?: any) {
    this.resolver = new DefinitionResolver(config?.definitions?.registry);
    this.executor = new ToolExecutor(this.resolver);
  }

  /**
   * Execute a tool with timeout support
   */
  async toolExecute(
    name: string,
    params: Record<string, any>,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    logger.info(`ToolAPI: Executing tool ${name}`);

    const resolved = await this.resolver.toolResolve(name);
    return await this.executor.execute(resolved.definition, params, options);
  }

  /**
   * Check if a tool exists
   */
  async toolHas(name: string): Promise<boolean> {
    try {
      await this.resolver.toolResolve(name);
      return true;
    } catch (error) {
      if (isForgeError(error) && error.code === 'TOOL_NOT_FOUND') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get tool information
   */
  async toolInfoGet(name: string): Promise<ToolInfo> {
    const resolved = await this.resolver.toolResolve(name);
    return {
      name: resolved.definition.name,
      version: resolved.version,
      description: resolved.definition.description,
      tags: resolved.definition.tags,
      author: resolved.definition.author,
      source: resolved.source,
    };
  }

  /**
   * List available tools
   */
  async toolList(filters?: { tags?: string[] }): Promise<ToolInfo[]> {
    // TODO: Implement listing logic
    logger.warn('toolList not yet fully implemented');
    return [];
  }
}
