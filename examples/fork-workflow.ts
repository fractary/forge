/**
 * Fork Workflow Example
 *
 * This example demonstrates the complete fork workflow:
 * - Forking an agent for customization
 * - Checking for upstream updates
 * - Merging upstream changes
 * - Handling merge conflicts
 */

import {
  DefinitionResolver,
  ForkManager,
  ManifestManager,
} from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

async function main() {
  console.log('=== Fork Workflow Example ===\n');

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

  const manifestManager = new ManifestManager();
  const forkManager = new ForkManager(resolver, manifestManager);

  // Step 1: Fork an agent
  console.log('Step 1: Forking agent...');
  try {
    await forkManager.forkAgent({
      sourceName: 'base-coding-agent',
      targetName: 'my-coding-agent',
      customizations: {
        description: 'My customized TypeScript coding assistant',
        prompt: `You are a specialized TypeScript coding assistant.

You focus on:
- Clean, maintainable code
- TypeScript best practices
- Test-driven development
- Performance optimization

Always explain your reasoning and provide examples.`,
        config: {
          temperature: 0.3, // Lower temperature for code generation
          max_tokens: 8192,
        },
      },
    });

    console.log('✓ Agent forked successfully');
    console.log('  Source: base-coding-agent');
    console.log('  Target: my-coding-agent');
    console.log('  Location: .fractary/agents/my-coding-agent.yaml');
    console.log();
  } catch (error: any) {
    if (error.code === 'AGENT_NOT_FOUND') {
      console.error('✗ Source agent not found. Please ensure base-coding-agent exists.\n');
    } else {
      console.error(`✗ Fork failed: ${error.message}\n`);
    }
    return;
  }

  // Step 2: Make some local customizations
  console.log('Step 2: Local customizations...');
  console.log('  (You can now edit .fractary/agents/my-coding-agent.yaml)');
  console.log('  Example: Add more tools, modify the prompt, etc.');
  console.log();

  // Step 3: Check for upstream updates
  console.log('Step 3: Checking for upstream updates...');
  try {
    const check = await forkManager.checkAgentUpstreamUpdates('my-coding-agent');

    if (check.hasUpdate) {
      console.log('✓ Upstream update available!');
      console.log(`  Current upstream: ${check.currentUpstreamVersion}`);
      console.log(`  Latest upstream: ${check.latestUpstreamVersion}`);

      if (check.changes && Object.keys(check.changes).length > 0) {
        console.log('  Changes detected in:');
        for (const key of Object.keys(check.changes)) {
          console.log(`    - ${key}`);
        }
      }
      console.log();
    } else {
      console.log('✓ No upstream updates available');
      console.log();
      return; // Nothing to merge
    }
  } catch (error: any) {
    console.error(`✗ Failed to check updates: ${error.message}\n`);
    return;
  }

  // Step 4: Merge upstream changes (auto strategy)
  console.log('Step 4: Merging upstream changes (auto)...');
  try {
    const autoResult = await forkManager.mergeUpstreamAgent('my-coding-agent', {
      strategy: 'auto',
    });

    if (autoResult.success) {
      console.log('✓ Auto-merge successful!');
      console.log(`  Merged paths: ${autoResult.merged.length}`);

      if (autoResult.merged.length > 0) {
        console.log('  Changes merged:');
        for (const path of autoResult.merged.slice(0, 5)) {
          console.log(`    - ${path}`);
        }
        if (autoResult.merged.length > 5) {
          console.log(`    ... and ${autoResult.merged.length - 5} more`);
        }
      }
      console.log();
    } else {
      console.log('✗ Auto-merge failed - conflicts detected');
      console.log(`  Conflicts: ${autoResult.conflicts.length}`);
      console.log();

      // Show conflicts
      console.log('Conflict details:');
      for (const conflict of autoResult.conflicts.slice(0, 3)) {
        console.log(`\n  Path: ${conflict.path}`);
        console.log(`    Base:     ${JSON.stringify(conflict.base)}`);
        console.log(`    Local:    ${JSON.stringify(conflict.local)}`);
        console.log(`    Upstream: ${JSON.stringify(conflict.upstream)}`);
      }
      if (autoResult.conflicts.length > 3) {
        console.log(`\n  ... and ${autoResult.conflicts.length - 3} more conflicts`);
      }
      console.log();

      // Try different resolution strategies
      await demonstrateResolutionStrategies(forkManager);
    }
  } catch (error: any) {
    console.error(`✗ Merge failed: ${error.message}\n`);
  }

  console.log('=== Example Complete ===');
}

async function demonstrateResolutionStrategies(forkManager: ForkManager) {
  console.log('Step 5: Trying different resolution strategies...\n');

  // Strategy 1: Keep local changes
  console.log('Strategy 1: Keep local changes');
  try {
    const localResult = await forkManager.mergeUpstreamAgent('my-coding-agent', {
      strategy: 'local',
    });

    if (localResult.success) {
      console.log('✓ Merged using local strategy');
      console.log('  All conflicts resolved by keeping local changes');
      console.log();
      return; // Success!
    }
  } catch (error: any) {
    console.error(`  ✗ Failed: ${error.message}\n`);
  }

  // Strategy 2: Accept upstream changes
  console.log('Strategy 2: Accept upstream changes');
  try {
    const upstreamResult = await forkManager.mergeUpstreamAgent('my-coding-agent', {
      strategy: 'upstream',
    });

    if (upstreamResult.success) {
      console.log('✓ Merged using upstream strategy');
      console.log('  All conflicts resolved by accepting upstream changes');
      console.log();
      return; // Success!
    }
  } catch (error: any) {
    console.error(`  ✗ Failed: ${error.message}\n`);
  }

  // Strategy 3: Manual resolution
  console.log('Strategy 3: Manual resolution');
  console.log('  For manual resolution:');
  console.log('  1. Review conflicts listed above');
  console.log('  2. Edit .fractary/agents/my-coding-agent.yaml');
  console.log('  3. Resolve each conflict manually');
  console.log('  4. Save the file');
  console.log();
}

// Run the example
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
