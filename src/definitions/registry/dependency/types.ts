/**
 * Dependency graph types
 */

export interface DependencyNode {
  name: string;
  version: string;
  type: 'agent' | 'tool';
  dependencies: string[]; // Names of dependencies
}

export interface DependencyTree {
  root: string;
  nodes: Map<string, DependencyNode>;
}

export interface Cycle {
  nodes: string[];
  description: string;
}

export interface DependencyResolutionOptions {
  maxDepth?: number; // Maximum dependency depth (default: 10)
  detectCycles?: boolean; // Detect circular dependencies (default: true)
}

export interface DependencyResolutionResult {
  tree: DependencyTree;
  cycles: Cycle[];
}
