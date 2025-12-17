/**
 * Dependency graph data structure
 */

import type { DependencyNode } from './types';

export class DependencyGraph {
  private nodes = new Map<string, DependencyNode>();
  private adjacencyList = new Map<string, Set<string>>();

  /**
   * Add a node to the graph
   */
  addNode(node: DependencyNode): void {
    this.nodes.set(node.name, node);

    if (!this.adjacencyList.has(node.name)) {
      this.adjacencyList.set(node.name, new Set());
    }

    // Add edges for dependencies
    // Edge direction: from dependency TO dependent (for topological sort)
    for (const dep of node.dependencies) {
      // Ensure dependency has an adjacency list entry
      if (!this.adjacencyList.has(dep)) {
        this.adjacencyList.set(dep, new Set());
      }
      // Add edge from dependency to this node (dependent)
      this.adjacencyList.get(dep)!.add(node.name);
    }
  }

  /**
   * Add an edge from one node to another
   */
  addEdge(from: string, to: string): void {
    if (!this.adjacencyList.has(from)) {
      this.adjacencyList.set(from, new Set());
    }
    this.adjacencyList.get(from)!.add(to);
  }

  /**
   * Get a node by name
   */
  getNode(name: string): DependencyNode | undefined {
    return this.nodes.get(name);
  }

  /**
   * Get dependencies of a node (what this node depends on)
   */
  getDependencies(name: string): string[] {
    const node = this.nodes.get(name);
    return node ? node.dependencies : [];
  }

  /**
   * Get dependents of a node (what depends on this node)
   */
  getDependents(name: string): string[] {
    const deps = this.adjacencyList.get(name);
    return deps ? Array.from(deps) : [];
  }

  /**
   * Get all node names
   */
  getNodes(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get all nodes as an array
   */
  getAllNodes(): DependencyNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Check if a node exists
   */
  hasNode(name: string): boolean {
    return this.nodes.has(name);
  }

  /**
   * Get the size of the graph (number of nodes)
   */
  size(): number {
    return this.nodes.size;
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
    this.adjacencyList.clear();
  }

  /**
   * Get topological sort of the graph (if acyclic)
   * Returns nodes in dependency order (dependencies before dependents)
   */
  topologicalSort(): string[] | null {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degrees
    for (const node of this.nodes.keys()) {
      inDegree.set(node, 0);
    }

    // Calculate in-degrees
    for (const [_, deps] of this.adjacencyList) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // Find nodes with no incoming edges
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const deps = this.adjacencyList.get(node);
      if (deps) {
        for (const dep of deps) {
          const newDegree = (inDegree.get(dep) || 0) - 1;
          inDegree.set(dep, newDegree);
          if (newDegree === 0) {
            queue.push(dep);
          }
        }
      }
    }

    // If result doesn't contain all nodes, there's a cycle
    if (result.length !== this.nodes.size) {
      return null;
    }

    return result;
  }
}
