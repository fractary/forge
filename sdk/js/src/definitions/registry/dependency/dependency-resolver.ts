/**
 * Dependency resolver for building dependency trees
 */

import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import type { DefinitionResolver } from '../resolver';
import { DependencyGraph } from './graph';
import { CycleDetector } from './cycle-detector';
import type {
  DependencyNode,
  DependencyTree,
  DependencyResolutionOptions,
  DependencyResolutionResult,
} from './types';

export class DependencyResolver {
  private cycleDetector = new CycleDetector();

  constructor(private resolver: DefinitionResolver) {}

  /**
   * Build complete dependency tree for an agent
   */
  async resolveAgentDependencies(
    agentName: string,
    options: DependencyResolutionOptions = {}
  ): Promise<DependencyResolutionResult> {
    const maxDepth = options.maxDepth || 10;
    const detectCycles = options.detectCycles !== false;

    logger.info(`Resolving dependencies for agent: ${agentName}`);

    const graph = new DependencyGraph();
    const visited = new Set<string>();

    await this.buildDependencyTree(agentName, 'agent', graph, visited, 0, maxDepth);

    // Detect cycles if requested
    const cycles = detectCycles ? this.cycleDetector.detectCycles(graph) : [];

    if (cycles.length > 0) {
      logger.warn(`Detected ${cycles.length} circular dependencies`);
      for (const cycle of cycles) {
        logger.warn(`  ${cycle.description}`);
      }
    }

    // Build tree structure
    const tree: DependencyTree = {
      root: agentName,
      nodes: new Map(graph.getAllNodes().map((n) => [n.name, n])),
    };

    return { tree, cycles };
  }

  /**
   * Build complete dependency tree for a tool
   */
  async resolveToolDependencies(
    toolName: string,
    options: DependencyResolutionOptions = {}
  ): Promise<DependencyResolutionResult> {
    const maxDepth = options.maxDepth || 10;
    const detectCycles = options.detectCycles !== false;

    logger.info(`Resolving dependencies for tool: ${toolName}`);

    const graph = new DependencyGraph();
    const visited = new Set<string>();

    await this.buildDependencyTree(toolName, 'tool', graph, visited, 0, maxDepth);

    // Detect cycles if requested
    const cycles = detectCycles ? this.cycleDetector.detectCycles(graph) : [];

    if (cycles.length > 0) {
      logger.warn(`Detected ${cycles.length} circular dependencies`);
      for (const cycle of cycles) {
        logger.warn(`  ${cycle.description}`);
      }
    }

    // Build tree structure
    const tree: DependencyTree = {
      root: toolName,
      nodes: new Map(graph.getAllNodes().map((n) => [n.name, n])),
    };

    return { tree, cycles };
  }

  /**
   * Recursively build dependency tree
   */
  private async buildDependencyTree(
    name: string,
    type: 'agent' | 'tool',
    graph: DependencyGraph,
    visited: Set<string>,
    depth: number,
    maxDepth: number
  ): Promise<void> {
    // Check max depth
    if (depth > maxDepth) {
      throw new ForgeError(
        DefinitionErrorCode.CIRCULAR_DEPENDENCY,
        `Maximum dependency depth (${maxDepth}) exceeded for ${type} '${name}'`,
        { name, type, depth }
      );
    }

    // Skip if already visited
    const key = `${type}:${name}`;
    if (visited.has(key)) {
      return;
    }
    visited.add(key);

    // Resolve definition
    const resolved =
      type === 'agent'
        ? await this.resolver.agentResolve(name)
        : await this.resolver.toolResolve(name);

    // Extract dependencies
    const dependencies: string[] = [];

    if (type === 'agent') {
      // Agents can depend on tools
      const agentDef = resolved.definition as any;
      if (agentDef.tools && Array.isArray(agentDef.tools)) {
        dependencies.push(...agentDef.tools);
      }
    } else {
      // Tools can depend on other tools
      const toolDef = resolved.definition as any;
      if (toolDef.depends_on && Array.isArray(toolDef.depends_on)) {
        dependencies.push(...toolDef.depends_on);
      }
    }

    // Add node to graph
    const node: DependencyNode = {
      name,
      version: resolved.version,
      type,
      dependencies,
    };
    graph.addNode(node);

    // Recursively resolve dependencies
    for (const dep of dependencies) {
      // Determine dependency type
      // For now, assume all dependencies are tools
      // In the future, we could support agent-to-agent dependencies
      const depType = type === 'agent' ? 'tool' : 'tool';

      try {
        await this.buildDependencyTree(dep, depType, graph, visited, depth + 1, maxDepth);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to resolve dependency ${dep}: ${errorMessage}`);
        // Continue with other dependencies even if one fails
      }
    }
  }

  /**
   * Check for circular dependencies in a definition
   */
  async checkForCycles(name: string, type: 'agent' | 'tool'): Promise<boolean> {
    const result =
      type === 'agent'
        ? await this.resolveAgentDependencies(name, { detectCycles: true })
        : await this.resolveToolDependencies(name, { detectCycles: true });

    return result.cycles.length > 0;
  }

  /**
   * Get flattened list of all dependencies in order
   */
  async getFlattenedDependencies(name: string, type: 'agent' | 'tool'): Promise<DependencyNode[]> {
    const result =
      type === 'agent'
        ? await this.resolveAgentDependencies(name)
        : await this.resolveToolDependencies(name);

    return Array.from(result.tree.nodes.values());
  }
}
