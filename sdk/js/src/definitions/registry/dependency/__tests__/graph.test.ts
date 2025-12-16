/**
 * Tests for DependencyGraph
 */

import { DependencyGraph } from '../graph';
import type { DependencyNode } from '../types';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe('addNode', () => {
    it('should add a node to the graph', () => {
      const node: DependencyNode = {
        name: 'test-agent',
        version: '1.0.0',
        type: 'agent',
        dependencies: [],
      };

      graph.addNode(node);

      expect(graph.hasNode('test-agent')).toBe(true);
      expect(graph.getNode('test-agent')).toEqual(node);
    });

    it('should create edges for dependencies', () => {
      const node: DependencyNode = {
        name: 'test-agent',
        version: '1.0.0',
        type: 'agent',
        dependencies: ['tool-1', 'tool-2'],
      };

      graph.addNode(node);

      const deps = graph.getDependencies('test-agent');
      expect(deps).toContain('tool-1');
      expect(deps).toContain('tool-2');
    });
  });

  describe('addEdge', () => {
    it('should add an edge between nodes', () => {
      graph.addEdge('node-a', 'node-b');

      const dependents = graph.getDependents('node-a');
      expect(dependents).toContain('node-b');
    });

    it('should create adjacency list entry if it does not exist', () => {
      graph.addEdge('new-node', 'dependency');

      const dependents = graph.getDependents('new-node');
      expect(dependents).toContain('dependency');
    });
  });

  describe('getNode', () => {
    it('should return undefined for non-existent node', () => {
      expect(graph.getNode('non-existent')).toBeUndefined();
    });

    it('should return the node if it exists', () => {
      const node: DependencyNode = {
        name: 'test',
        version: '1.0.0',
        type: 'tool',
        dependencies: [],
      };

      graph.addNode(node);

      expect(graph.getNode('test')).toEqual(node);
    });
  });

  describe('getDependencies', () => {
    it('should return empty array for node with no dependencies', () => {
      const node: DependencyNode = {
        name: 'test',
        version: '1.0.0',
        type: 'tool',
        dependencies: [],
      };

      graph.addNode(node);

      expect(graph.getDependencies('test')).toEqual([]);
    });

    it('should return empty array for non-existent node', () => {
      expect(graph.getDependencies('non-existent')).toEqual([]);
    });

    it('should return all dependencies', () => {
      const node: DependencyNode = {
        name: 'test',
        version: '1.0.0',
        type: 'agent',
        dependencies: ['dep-1', 'dep-2', 'dep-3'],
      };

      graph.addNode(node);

      const deps = graph.getDependencies('test');
      expect(deps).toHaveLength(3);
      expect(deps).toContain('dep-1');
      expect(deps).toContain('dep-2');
      expect(deps).toContain('dep-3');
    });
  });

  describe('getNodes', () => {
    it('should return empty array for empty graph', () => {
      expect(graph.getNodes()).toEqual([]);
    });

    it('should return all node names', () => {
      graph.addNode({
        name: 'node-1',
        version: '1.0.0',
        type: 'agent',
        dependencies: [],
      });

      graph.addNode({
        name: 'node-2',
        version: '2.0.0',
        type: 'tool',
        dependencies: [],
      });

      const nodes = graph.getNodes();
      expect(nodes).toHaveLength(2);
      expect(nodes).toContain('node-1');
      expect(nodes).toContain('node-2');
    });
  });

  describe('getAllNodes', () => {
    it('should return empty array for empty graph', () => {
      expect(graph.getAllNodes()).toEqual([]);
    });

    it('should return all nodes', () => {
      const node1: DependencyNode = {
        name: 'node-1',
        version: '1.0.0',
        type: 'agent',
        dependencies: [],
      };

      const node2: DependencyNode = {
        name: 'node-2',
        version: '2.0.0',
        type: 'tool',
        dependencies: [],
      };

      graph.addNode(node1);
      graph.addNode(node2);

      const nodes = graph.getAllNodes();
      expect(nodes).toHaveLength(2);
      expect(nodes).toContainEqual(node1);
      expect(nodes).toContainEqual(node2);
    });
  });

  describe('hasNode', () => {
    it('should return false for non-existent node', () => {
      expect(graph.hasNode('non-existent')).toBe(false);
    });

    it('should return true for existing node', () => {
      graph.addNode({
        name: 'test',
        version: '1.0.0',
        type: 'tool',
        dependencies: [],
      });

      expect(graph.hasNode('test')).toBe(true);
    });
  });

  describe('size', () => {
    it('should return 0 for empty graph', () => {
      expect(graph.size()).toBe(0);
    });

    it('should return correct size', () => {
      graph.addNode({
        name: 'node-1',
        version: '1.0.0',
        type: 'agent',
        dependencies: [],
      });

      graph.addNode({
        name: 'node-2',
        version: '2.0.0',
        type: 'tool',
        dependencies: [],
      });

      expect(graph.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear the graph', () => {
      graph.addNode({
        name: 'test',
        version: '1.0.0',
        type: 'tool',
        dependencies: [],
      });

      expect(graph.size()).toBe(1);

      graph.clear();

      expect(graph.size()).toBe(0);
      expect(graph.getNodes()).toEqual([]);
    });
  });

  describe('topologicalSort', () => {
    it('should return sorted nodes for acyclic graph', () => {
      // Create a simple DAG: A -> B -> C
      graph.addNode({
        name: 'A',
        version: '1.0.0',
        type: 'agent',
        dependencies: ['B'],
      });

      graph.addNode({
        name: 'B',
        version: '1.0.0',
        type: 'tool',
        dependencies: ['C'],
      });

      graph.addNode({
        name: 'C',
        version: '1.0.0',
        type: 'tool',
        dependencies: [],
      });

      const sorted = graph.topologicalSort();
      expect(sorted).not.toBeNull();
      expect(sorted).toHaveLength(3);

      // C should come before B, and B before A
      const indexC = sorted!.indexOf('C');
      const indexB = sorted!.indexOf('B');
      const indexA = sorted!.indexOf('A');

      expect(indexC).toBeLessThan(indexB);
      expect(indexB).toBeLessThan(indexA);
    });

    it('should return null for cyclic graph', () => {
      // Create a cycle: A -> B -> C -> A
      graph.addNode({
        name: 'A',
        version: '1.0.0',
        type: 'agent',
        dependencies: ['B'],
      });

      graph.addNode({
        name: 'B',
        version: '1.0.0',
        type: 'tool',
        dependencies: ['C'],
      });

      graph.addNode({
        name: 'C',
        version: '1.0.0',
        type: 'tool',
        dependencies: ['A'],
      });

      const sorted = graph.topologicalSort();
      expect(sorted).toBeNull();
    });

    it('should handle empty graph', () => {
      const sorted = graph.topologicalSort();
      expect(sorted).toEqual([]);
    });

    it('should handle disconnected components', () => {
      // Create two disconnected components
      graph.addNode({
        name: 'A',
        version: '1.0.0',
        type: 'agent',
        dependencies: ['B'],
      });

      graph.addNode({
        name: 'B',
        version: '1.0.0',
        type: 'tool',
        dependencies: [],
      });

      graph.addNode({
        name: 'C',
        version: '1.0.0',
        type: 'tool',
        dependencies: ['D'],
      });

      graph.addNode({
        name: 'D',
        version: '1.0.0',
        type: 'tool',
        dependencies: [],
      });

      const sorted = graph.topologicalSort();
      expect(sorted).not.toBeNull();
      expect(sorted).toHaveLength(4);

      // Verify dependency order within each component
      const indexB = sorted!.indexOf('B');
      const indexA = sorted!.indexOf('A');
      expect(indexB).toBeLessThan(indexA);

      const indexD = sorted!.indexOf('D');
      const indexC = sorted!.indexOf('C');
      expect(indexD).toBeLessThan(indexC);
    });
  });
});
