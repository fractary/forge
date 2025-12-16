/**
 * Basic Usage Example
 *
 * This example demonstrates basic resolver and lockfile usage.
 */

import {
  DefinitionResolver,
  LockfileManager,
  ManifestManager,
} from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

async function main() {
  console.log('=== Basic Usage Example ===\n');

  // Step 1: Create resolver with default configuration
  console.log('Step 1: Creating resolver...');
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
      enabled: false, // Enable when Stockyard is available
    },
  });
  console.log('✓ Resolver created\n');

  // Step 2: Resolve an agent
  console.log('Step 2: Resolving agent...');
  try {
    const agent = await resolver.resolveAgent('my-agent@^1.0.0');

    console.log('✓ Agent resolved:');
    console.log(`  Name: ${agent.definition.name}`);
    console.log(`  Version: ${agent.version}`);
    console.log(`  Source: ${agent.source}`);
    console.log(`  Model: ${agent.definition.model?.name}`);
    console.log(`  Tools: ${agent.definition.tools?.join(', ') || 'none'}`);
    console.log();
  } catch (error: any) {
    console.error(`✗ Failed to resolve agent: ${error.message}\n`);
  }

  // Step 3: Resolve a tool
  console.log('Step 3: Resolving tool...');
  try {
    const tool = await resolver.resolveTool('web-search@^1.0.0');

    console.log('✓ Tool resolved:');
    console.log(`  Name: ${tool.definition.name}`);
    console.log(`  Version: ${tool.version}`);
    console.log(`  Source: ${tool.source}`);
    console.log(`  Parameters: ${Object.keys(tool.definition.parameters?.properties || {}).join(', ')}`);
    console.log();
  } catch (error: any) {
    console.error(`✗ Failed to resolve tool: ${error.message}\n`);
  }

  // Step 4: Generate lockfile
  console.log('Step 4: Generating lockfile...');
  const lockfileManager = new LockfileManager(resolver);

  try {
    const lockfile = await lockfileManager.generate({
      force: true, // Regenerate even if exists
    });

    console.log('✓ Lockfile generated:');
    console.log(`  Agents locked: ${Object.keys(lockfile.agents).length}`);
    console.log(`  Tools locked: ${Object.keys(lockfile.tools).length}`);
    console.log(`  Generated at: ${lockfile.generated}`);
    console.log(`  Saved to: .fractary/forge.lock`);
    console.log();
  } catch (error: any) {
    console.error(`✗ Failed to generate lockfile: ${error.message}\n`);
  }

  // Step 5: Load and validate lockfile
  console.log('Step 5: Validating lockfile...');
  try {
    const lockfile = await lockfileManager.load();

    console.log('✓ Lockfile loaded:');
    console.log(`  Version: ${lockfile.version}`);
    console.log(`  Generated: ${lockfile.generated}`);

    const validation = await lockfileManager.validate(lockfile);

    if (validation.valid) {
      console.log('  Status: ✓ Valid');
    } else {
      console.log('  Status: ✗ Invalid');
      console.log('  Errors:');
      for (const error of validation.errors) {
        console.log(`    - ${error}`);
      }
    }
    console.log();
  } catch (error: any) {
    console.error(`✗ Failed to validate lockfile: ${error.message}\n`);
  }

  // Step 6: Work with manifests
  console.log('Step 6: Managing manifests...');
  const manifestManager = new ManifestManager();

  try {
    // Get manifest for an agent
    const manifest = await manifestManager.getManifest('my-agent', 'agent');

    if (manifest) {
      console.log('✓ Manifest loaded:');
      console.log(`  Name: ${manifest.name}`);
      console.log(`  Type: ${manifest.type}`);
      console.log(`  Latest: ${manifest.latest}`);
      console.log(`  Installed: ${manifest.installed_versions.join(', ')}`);
      console.log(`  Update available: ${manifest.update_available ? 'Yes' : 'No'}`);
    } else {
      console.log('  No manifest found for my-agent');
    }
    console.log();
  } catch (error: any) {
    console.error(`✗ Failed to load manifest: ${error.message}\n`);
  }

  console.log('=== Example Complete ===');
}

// Run the example
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
