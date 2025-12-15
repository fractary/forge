/**
 * Dependency Management Example
 *
 * This example demonstrates:
 * - Building dependency trees
 * - Detecting circular dependencies
 * - Resolving dependencies in correct order
 * - Visualizing dependency graphs
 */

import {
  DefinitionResolver,
  DependencyResolver,
  type DependencyTree,
  type DependencyNode,
} from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

async function main() {
  console.log('=== Dependency Management Example ===\n');

  // Setup
  const resolver = new DefinitionResolver({
    local: {
      enabled: true,
      paths: [
        path.join(process.cwd(), '.fractary/agents'),
        path.join(process.cwd(), '.fractary/tools'),
      ],
    },
    global: {
      enabled: true,
      path: path.join(os.homedir(), '.fractary/registry'),
    },
    stockyard: {
      enabled: false,
    },
  });

  const depResolver = new DependencyResolver(resolver);

  // Step 1: Build dependency tree for an agent
  console.log('Step 1: Building dependency tree...');
  try {
    const tree = await depResolver.buildDependencyTree('my-agent', 'agent');

    console.log('✓ Dependency tree built successfully');
    console.log(`  Total nodes: ${tree.nodes.size}`);
    console.log(`  Root: ${tree.root}`);
    console.log();

    // Display tree structure
    console.log('Tree structure:');
    displayTree(tree);
    console.log();
  } catch (error: any) {
    if (error.code === 'CIRCULAR_DEPENDENCY') {
      console.error('✗ Circular dependency detected!');
      console.error(`  Cycle: ${error.metadata.cycle.join(' → ')}`);
      console.log();
    } else if (error.code === 'AGENT_NOT_FOUND') {
      console.error('✗ Agent not found');
      console.error('  Please ensure "my-agent" exists in your registry');
      console.log();
    } else {
      console.error(`✗ Failed to build tree: ${error.message}\n`);
    }
    return;
  }

  // Step 2: Resolve with dependencies
  console.log('Step 2: Resolving agent with all dependencies...');
  try {
    const resolved = await depResolver.resolveWithDependencies('my-agent', 'agent');

    console.log('✓ Agent and dependencies resolved');
    console.log(`\nMain Agent: ${resolved.main.definition.name}@${resolved.main.version}`);
    console.log(`Source: ${resolved.main.source}`);
    console.log();

    if (resolved.dependencies.length > 0) {
      console.log(`Dependencies (${resolved.dependencies.length}):`);
      for (const dep of resolved.dependencies) {
        console.log(`  - ${dep.definition.name}@${dep.version} (${dep.definition.type})`);
        console.log(`    Source: ${dep.source}`);

        // Show nested dependencies if any
        const toolDef = dep.definition as any;
        if (toolDef.depends_on && toolDef.depends_on.length > 0) {
          console.log(`    Depends on: ${toolDef.depends_on.join(', ')}`);
        }
      }
      console.log();
    } else {
      console.log('No dependencies\n');
    }
  } catch (error: any) {
    console.error(`✗ Resolution failed: ${error.message}\n`);
  }

  // Step 3: Analyze dependency depth
  console.log('Step 3: Analyzing dependency depth...');
  try {
    const tree = await depResolver.buildDependencyTree('my-agent', 'agent');
    const analysis = analyzeDependencyDepth(tree);

    console.log('✓ Depth analysis complete');
    console.log(`  Maximum depth: ${analysis.maxDepth}`);
    console.log(`  Average depth: ${analysis.avgDepth.toFixed(2)}`);
    console.log();

    if (analysis.byDepth.size > 0) {
      console.log('Dependencies by depth:');
      for (const [depth, nodes] of Array.from(analysis.byDepth.entries()).sort(
        (a, b) => a[0] - b[0]
      )) {
        console.log(`  Level ${depth}: ${nodes.join(', ')}`);
      }
      console.log();
    }
  } catch (error: any) {
    console.error(`✗ Analysis failed: ${error.message}\n`);
  }

  // Step 4: Find shared dependencies
  console.log('Step 4: Finding shared dependencies...');
  try {
    const tree = await depResolver.buildDependencyTree('my-agent', 'agent');
    const shared = findSharedDependencies(tree);

    if (shared.size > 0) {
      console.log('✓ Shared dependencies found:');
      for (const [dep, users] of shared) {
        console.log(`  ${dep} is used by: ${users.join(', ')}`);
      }
      console.log();
    } else {
      console.log('No shared dependencies found\n');
    }
  } catch (error: any) {
    console.error(`✗ Analysis failed: ${error.message}\n`);
  }

  // Step 5: Detect circular dependencies
  console.log('Step 5: Testing circular dependency detection...');
  try {
    // This should detect a cycle if one exists
    await depResolver.buildDependencyTree('my-agent', 'agent');
    console.log('✓ No circular dependencies detected\n');
  } catch (error: any) {
    if (error.code === 'CIRCULAR_DEPENDENCY') {
      console.log('✗ Circular dependency detected!');
      console.log(`  Cycle: ${error.metadata.cycle.join(' → ')}`);
      console.log();
      console.log('  To fix this:');
      console.log('  1. Review the dependency chain');
      console.log('  2. Remove the circular reference');
      console.log('  3. Consider refactoring to break the cycle');
      console.log();
    } else {
      console.error(`✗ Error: ${error.message}\n`);
    }
  }

  // Step 6: Visualize dependency graph
  console.log('Step 6: Visualizing dependency graph...');
  try {
    const tree = await depResolver.buildDependencyTree('my-agent', 'agent');
    console.log('✓ Graph visualization:\n');
    visualizeGraph(tree);
    console.log();
  } catch (error: any) {
    console.error(`✗ Visualization failed: ${error.message}\n`);
  }

  // Step 7: Compare dependency trees
  console.log('Step 7: Comparing dependency trees...');
  try {
    const tree1 = await depResolver.buildDependencyTree('my-agent', 'agent');

    // Try another agent if available
    try {
      const tree2 = await depResolver.buildDependencyTree('other-agent', 'agent');
      const comparison = compareTrees(tree1, tree2);

      console.log('✓ Comparison complete:');
      console.log(`  Unique to my-agent: ${comparison.uniqueToFirst.length}`);
      console.log(`  Unique to other-agent: ${comparison.uniqueToSecond.length}`);
      console.log(`  Shared: ${comparison.shared.length}`);
      console.log();

      if (comparison.shared.length > 0) {
        console.log('  Shared dependencies:');
        for (const dep of comparison.shared) {
          console.log(`    - ${dep}`);
        }
        console.log();
      }
    } catch {
      console.log('  (Only one agent available for comparison)\n');
    }
  } catch (error: any) {
    console.error(`✗ Comparison failed: ${error.message}\n`);
  }

  console.log('=== Example Complete ===');
}

// Helper: Display tree structure
function displayTree(tree: DependencyTree, indent = 0, visited = new Set<string>()): void {
  const rootNode = tree.nodes.get(tree.root);
  if (!rootNode) return;

  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${rootNode.name}@${rootNode.version} (${rootNode.type})`);

  visited.add(tree.root);

  // Display tool dependencies
  if (rootNode.dependencies.tools) {
    for (const toolName of rootNode.dependencies.tools) {
      const toolNode = Array.from(tree.nodes.values()).find((n) => n.name === toolName);
      if (toolNode && !visited.has(toolNode.name)) {
        const toolPrefix = '  '.repeat(indent + 1);
        console.log(`${toolPrefix}├─ ${toolNode.name}@${toolNode.version} (tool)`);
        visited.add(toolNode.name);

        // Show nested dependencies
        if (toolNode.dependencies.tools && toolNode.dependencies.tools.length > 0) {
          for (const nested of toolNode.dependencies.tools) {
            const nestedNode = Array.from(tree.nodes.values()).find(
              (n) => n.name === nested
            );
            if (nestedNode && !visited.has(nestedNode.name)) {
              const nestedPrefix = '  '.repeat(indent + 2);
              console.log(`${nestedPrefix}└─ ${nestedNode.name}@${nestedNode.version} (tool)`);
              visited.add(nestedNode.name);
            }
          }
        }
      }
    }
  }
}

// Helper: Analyze dependency depth
function analyzeDependencyDepth(tree: DependencyTree): {
  maxDepth: number;
  avgDepth: number;
  byDepth: Map<number, string[]>;
} {
  const depths = new Map<string, number>();
  const byDepth = new Map<number, string[]>();

  // Calculate depth for each node (BFS)
  const queue: Array<{ name: string; depth: number }> = [{ name: tree.root, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { name, depth } = queue.shift()!;

    if (visited.has(name)) continue;
    visited.add(name);

    depths.set(name, depth);

    if (!byDepth.has(depth)) {
      byDepth.set(depth, []);
    }
    byDepth.get(depth)!.push(name);

    const node = tree.nodes.get(name);
    if (node?.dependencies.tools) {
      for (const toolName of node.dependencies.tools) {
        queue.push({ name: toolName, depth: depth + 1 });
      }
    }
  }

  const maxDepth = Math.max(...Array.from(depths.values()));
  const avgDepth =
    Array.from(depths.values()).reduce((sum, d) => sum + d, 0) / depths.size;

  return { maxDepth, avgDepth, byDepth };
}

// Helper: Find shared dependencies
function findSharedDependencies(tree: DependencyTree): Map<string, string[]> {
  const usage = new Map<string, string[]>();

  for (const [name, node] of tree.nodes) {
    if (node.dependencies.tools) {
      for (const tool of node.dependencies.tools) {
        if (!usage.has(tool)) {
          usage.set(tool, []);
        }
        usage.get(tool)!.push(name);
      }
    }
  }

  // Filter to only shared (used by 2+ nodes)
  const shared = new Map<string, string[]>();
  for (const [dep, users] of usage) {
    if (users.length > 1) {
      shared.set(dep, users);
    }
  }

  return shared;
}

// Helper: Visualize dependency graph
function visualizeGraph(tree: DependencyTree): void {
  const visited = new Set<string>();

  function renderNode(name: string, prefix = '', isLast = true): void {
    if (visited.has(name)) {
      console.log(`${prefix}${isLast ? '└─' : '├─'} ${name} (already shown)`);
      return;
    }

    visited.add(name);

    const node = tree.nodes.get(name);
    if (!node) return;

    console.log(
      `${prefix}${isLast ? '└─' : '├─'} ${node.name}@${node.version} (${node.type})`
    );

    const deps = node.dependencies.tools || [];
    const newPrefix = prefix + (isLast ? '   ' : '│  ');

    deps.forEach((dep, index) => {
      const isLastDep = index === deps.length - 1;
      renderNode(dep, newPrefix, isLastDep);
    });
  }

  renderNode(tree.root);
}

// Helper: Compare two dependency trees
function compareTrees(
  tree1: DependencyTree,
  tree2: DependencyTree
): {
  uniqueToFirst: string[];
  uniqueToSecond: string[];
  shared: string[];
} {
  const nodes1 = new Set(tree1.nodes.keys());
  const nodes2 = new Set(tree2.nodes.keys());

  const uniqueToFirst = Array.from(nodes1).filter((n) => !nodes2.has(n));
  const uniqueToSecond = Array.from(nodes2).filter((n) => !nodes1.has(n));
  const shared = Array.from(nodes1).filter((n) => nodes2.has(n));

  return { uniqueToFirst, uniqueToSecond, shared };
}

// Run the example
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
