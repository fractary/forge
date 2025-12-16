/**
 * Tests for CycleDetector
 */

import { DependencyGraph } from '../graph';
import { CycleDetector } from '../cycle-detector';
import type { DependencyNode } from '../types';

describe('CycleDetector', () => {
  let detector: CycleDetector;
  let graph: DependencyGraph;

  beforeEach(() => {
    detector = new CycleDetector();
    graph = new DependencyGraph();
  });

  describe('detectCycles', () => {
    it('should return empty array for acyclic graph', () => {
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

      const cycles = detector.detectCycles(graph);
      expect(cycles).toEqual([]);
    });

    it('should detect simple cycle', () => {
      // Create a simple cycle: A -> B -> A
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
        dependencies: ['A'],
      });

      const cycles = detector.detectCycles(graph);
      expect(cycles).toHaveLength(1);
      expect(cycles[0].nodes).toContain('A');
      expect(cycles[0].nodes).toContain('B');
    });

    it('should detect self-loop', () => {
      // Create a self-loop: A -> A
      graph.addNode({
        name: 'A',
        version: '1.0.0',
        type: 'agent',
        dependencies: ['A'],
      });

      const cycles = detector.detectCycles(graph);
      expect(cycles).toHaveLength(1);
      expect(cycles[0].nodes).toEqual(['A']);
    });

    it('should detect longer cycle', () => {
      // Create a cycle: A -> B -> C -> D -> A
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
        dependencies: ['D'],
      });

      graph.addNode({
        name: 'D',
        version: '1.0.0',
        type: 'tool',
        dependencies: ['A'],
      });

      const cycles = detector.detectCycles(graph);
      expect(cycles).toHaveLength(1);
      expect(cycles[0].nodes).toHaveLength(4);
    });

    it('should detect multiple cycles', () => {
      // Create two separate cycles:
      // Cycle 1: A -> B -> A
      // Cycle 2: C -> D -> C
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
        dependencies: ['A'],
      });

      graph.addNode({
        name: 'C',
        version: '1.0.0',
        type: 'agent',
        dependencies: ['D'],
      });

      graph.addNode({
        name: 'D',
        version: '1.0.0',
        type: 'tool',
        dependencies: ['C'],
      });

      const cycles = detector.detectCycles(graph);
      expect(cycles.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty graph', () => {
      const cycles = detector.detectCycles(graph);
      expect(cycles).toEqual([]);
    });

    it('should handle graph with no cycles but multiple paths', () => {
      // Diamond pattern: A -> B -> D, A -> C -> D
      graph.addNode({
        name: 'A',
        version: '1.0.0',
        type: 'agent',
        dependencies: ['B', 'C'],
      });

      graph.addNode({
        name: 'B',
        version: '1.0.0',
        type: 'tool',
        dependencies: ['D'],
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

      const cycles = detector.detectCycles(graph);
      expect(cycles).toEqual([]);
    });

    it('should provide description for detected cycle', () => {
      // Create cycle: A -> B -> C -> A
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

      const cycles = detector.detectCycles(graph);
      expect(cycles).toHaveLength(1);
      expect(cycles[0].description).toContain('->');
      expect(cycles[0].description).toContain('A');
      expect(cycles[0].description).toContain('B');
      expect(cycles[0].description).toContain('C');
    });
  });

  describe('hasCycles', () => {
    it('should return false for acyclic graph', () => {
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

      expect(detector.hasCycles(graph)).toBe(false);
    });

    it('should return true for cyclic graph', () => {
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
        dependencies: ['A'],
      });

      expect(detector.hasCycles(graph)).toBe(true);
    });

    it('should return false for empty graph', () => {
      expect(detector.hasCycles(graph)).toBe(false);
    });
  });
});
