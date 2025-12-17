/**
 * Circular dependency detection using depth-first search
 */

import type { DependencyGraph } from './graph';
import type { Cycle } from './types';

export class CycleDetector {
  /**
   * Detect circular dependencies in a dependency graph
   * Uses depth-first search for cycle detection
   */
  detectCycles(graph: DependencyGraph): Cycle[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const cycles: Cycle[] = [];

    const dfs = (node: string, path: string[]): void => {
      if (visiting.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        const cyclePath = path.slice(cycleStart).concat(node);
        cycles.push({
          nodes: path.slice(cycleStart),
          description: cyclePath.join(' -> '),
        });
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visiting.add(node);
      path.push(node);

      for (const dep of graph.getDependencies(node)) {
        dfs(dep, [...path]);
      }

      visiting.delete(node);
      visited.add(node);
    };

    for (const node of graph.getNodes()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * Check if graph has any cycles
   */
  hasCycles(graph: DependencyGraph): boolean {
    return this.detectCycles(graph).length > 0;
  }
}
