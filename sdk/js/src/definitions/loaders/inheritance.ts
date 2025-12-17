/**
 * Definition inheritance resolver
 * Resolves `extends` fields in agent and tool definitions
 */

import { logger } from '../../logger';
import { ForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import type { AgentDefinition, ToolDefinition } from '../schemas';

/**
 * Interface for definition resolver (to avoid circular dependency)
 */
export interface IDefinitionResolver {
  agentResolve(name: string): Promise<{ definition: AgentDefinition } | null>;
  toolResolve(name: string): Promise<{ definition: ToolDefinition } | null>;
}

export class InheritanceResolver {
  private resolver: IDefinitionResolver;
  private resolutionStack: Set<string> = new Set();

  constructor(resolver: IDefinitionResolver) {
    this.resolver = resolver;
  }

  /**
   * Resolve agent inheritance
   */
  async agentResolve(definition: AgentDefinition): Promise<AgentDefinition> {
    if (!definition.extends) {
      return definition;
    }

    logger.debug(
      `Resolving inheritance for agent: ${definition.name} extends ${definition.extends}`
    );

    // Detect cycles
    if (this.resolutionStack.has(definition.name)) {
      throw new ForgeError(
        DefinitionErrorCode.INHERITANCE_CYCLE,
        `Circular inheritance detected: ${Array.from(this.resolutionStack).join(' -> ')} -> ${definition.name}`,
        { cycle: Array.from(this.resolutionStack), current: definition.name }
      );
    }

    this.resolutionStack.add(definition.name);

    try {
      // Resolve base agent
      const baseAgent = await this.resolver.agentResolve(definition.extends);
      if (!baseAgent) {
        throw new ForgeError(
          DefinitionErrorCode.INHERITANCE_BASE_NOT_FOUND,
          `Base agent '${definition.extends}' not found for '${definition.name}'`,
          { base: definition.extends, child: definition.name }
        );
      }

      // Recursively resolve base's extends
      const resolvedBase = await this.agentResolve(baseAgent.definition);

      // Merge: child overrides base
      return this.mergeAgentDefinitions(resolvedBase, definition);
    } finally {
      this.resolutionStack.delete(definition.name);
    }
  }

  /**
   * Resolve tool inheritance
   */
  async toolResolve(definition: ToolDefinition): Promise<ToolDefinition> {
    if (!definition.extends) {
      return definition;
    }

    logger.debug(
      `Resolving inheritance for tool: ${definition.name} extends ${definition.extends}`
    );

    // Detect cycles
    if (this.resolutionStack.has(definition.name)) {
      throw new ForgeError(
        DefinitionErrorCode.INHERITANCE_CYCLE,
        `Circular inheritance detected: ${Array.from(this.resolutionStack).join(' -> ')} -> ${definition.name}`,
        { cycle: Array.from(this.resolutionStack), current: definition.name }
      );
    }

    this.resolutionStack.add(definition.name);

    try {
      // Resolve base tool
      const baseTool = await this.resolver.toolResolve(definition.extends);
      if (!baseTool) {
        throw new ForgeError(
          DefinitionErrorCode.INHERITANCE_BASE_NOT_FOUND,
          `Base tool '${definition.extends}' not found for '${definition.name}'`,
          { base: definition.extends, child: definition.name }
        );
      }

      // Recursively resolve base's extends
      const resolvedBase = await this.toolResolve(baseTool.definition);

      // Merge: child overrides base
      return this.mergeToolDefinitions(resolvedBase, definition);
    } finally {
      this.resolutionStack.delete(definition.name);
    }
  }

  /**
   * Merge agent definitions (child overrides base)
   */
  private mergeAgentDefinitions(base: AgentDefinition, child: AgentDefinition): AgentDefinition {
    return {
      ...base,
      ...child,
      // Merge tools arrays (child additions + base tools)
      tools: Array.from(new Set([...(base.tools || []), ...(child.tools || [])])),
      // Merge custom_tools (child can override by name)
      custom_tools: this.mergeCustomTools(base.custom_tools, child.custom_tools),
      // Merge config objects deeply
      config: { ...(base.config || {}), ...(child.config || {}) },
      // Merge tags
      tags: Array.from(new Set([...(base.tags || []), ...(child.tags || [])])),
      // Child's extends is removed after resolution
      extends: undefined,
    };
  }

  /**
   * Merge tool definitions (child overrides base)
   */
  private mergeToolDefinitions(base: ToolDefinition, child: ToolDefinition): ToolDefinition {
    return {
      ...base,
      ...child,
      // Merge parameters (child can override)
      parameters: { ...(base.parameters || {}), ...(child.parameters || {}) },
      // Merge depends_on arrays
      depends_on: Array.from(new Set([...(base.depends_on || []), ...(child.depends_on || [])])),
      // Merge tags
      tags: Array.from(new Set([...(base.tags || []), ...(child.tags || [])])),
      // Child's extends is removed after resolution
      extends: undefined,
    };
  }

  /**
   * Merge custom tools arrays (child overrides by name)
   */
  private mergeCustomTools(
    baseTools?: ToolDefinition[],
    childTools?: ToolDefinition[]
  ): ToolDefinition[] {
    const toolMap = new Map<string, ToolDefinition>();

    for (const tool of baseTools || []) {
      toolMap.set(tool.name, tool);
    }
    for (const tool of childTools || []) {
      toolMap.set(tool.name, tool); // Child overrides base
    }

    return Array.from(toolMap.values());
  }
}
