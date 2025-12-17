/**
 * Tool dependency resolver with cycle detection
 */

import { logger } from '../../logger';
import { ForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import type { DefinitionResolver } from '../registry/resolver';
import type { ToolResult } from './types';

export class DependencyResolver {
  private resolver: DefinitionResolver;
  private executionStack: Set<string> = new Set();

  constructor(resolver: DefinitionResolver) {
    this.resolver = resolver;
  }

  /**
   * Execute tool dependencies in order
   */
  async executeDependencies(
    dependencies: string[],
    params: Record<string, any>
  ): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>();

    for (const depName of dependencies) {
      // Detect cycles
      if (this.executionStack.has(depName)) {
        throw new ForgeError(
          DefinitionErrorCode.TOOL_DEPENDENCY_CYCLE,
          `Circular tool dependency detected: ${Array.from(this.executionStack).join(' -> ')} -> ${depName}`,
          { cycle: Array.from(this.executionStack), current: depName }
        );
      }

      this.executionStack.add(depName);

      try {
        // Resolve dependency tool
        const depTool = await this.resolver.resolveTool(depName);
        if (!depTool) {
          throw new ForgeError(
            DefinitionErrorCode.TOOL_DEPENDENCY_NOT_FOUND,
            `Dependency tool '${depName}' not found`,
            { dependency: depName }
          );
        }

        // Recursively execute dependency's dependencies
        if (depTool.definition.depends_on?.length) {
          await this.executeDependencies(depTool.definition.depends_on, params);
        }

        // Execute the dependency
        logger.debug(`Executing dependency tool: ${depName}`);

        // Import ToolExecutor here to avoid circular dependency
        const { ToolExecutor } = await import('./tool-executor');
        const executor = new ToolExecutor();
        const result = await executor.execute(depTool.definition, params);

        results.set(depName, result);

        if (!result.success) {
          throw new ForgeError(
            DefinitionErrorCode.TOOL_EXECUTION_FAILED,
            `Dependency tool '${depName}' failed`,
            { dependency: depName, error: result.error }
          );
        }
      } finally {
        this.executionStack.delete(depName);
      }
    }

    return results;
  }
}
