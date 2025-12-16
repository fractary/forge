/**
 * Update Management Example
 *
 * This example demonstrates:
 * - Checking for available updates
 * - Applying non-breaking updates
 * - Handling breaking changes
 * - Rolling back updates
 * - Dry run mode
 */

import {
  DefinitionResolver,
  LockfileManager,
  ManifestManager,
  UpdateChecker,
  UpdateManager,
} from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

async function main() {
  console.log('=== Update Management Example ===\n');

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

  const lockfileManager = new LockfileManager(resolver);
  const manifestManager = new ManifestManager();
  const updateChecker = new UpdateChecker(lockfileManager, manifestManager);
  const updateManager = new UpdateManager(
    resolver,
    lockfileManager,
    manifestManager,
    updateChecker
  );

  // Step 1: Check for updates
  console.log('Step 1: Checking for updates...');
  try {
    const updates = await updateChecker.checkUpdates();

    if (updates.hasUpdates) {
      console.log('✓ Updates available!\n');
      console.log(updateChecker.formatUpdateSummary(updates));
      console.log();

      // Show breaking changes
      if (updates.breakingChanges.length > 0) {
        console.log('⚠️  Breaking Changes Detected:');
        for (const update of updates.breakingChanges) {
          console.log(`  ${update.name}: ${update.currentVersion} → ${update.latestVersion}`);
        }
        console.log();
      }
    } else {
      console.log('✓ All packages are up to date!');
      console.log();
      return;
    }
  } catch (error: any) {
    console.error(`✗ Failed to check updates: ${error.message}\n`);
    return;
  }

  // Step 2: Dry run update
  console.log('Step 2: Dry run update (preview changes)...');
  try {
    const dryRunResult = await updateManager.update({
      dryRun: true,
      skipBreaking: true,
    });

    console.log('✓ Dry run complete');
    console.log('\nThe following updates would be applied:\n');

    for (const update of dryRunResult.updated) {
      const isBreaking = update.from.split('.')[0] !== update.to.split('.')[0];
      const emoji = isBreaking ? '⚠️ ' : '✓ ';
      console.log(`${emoji} ${update.name}: ${update.from} → ${update.to}`);
    }

    if (dryRunResult.skipped.length > 0) {
      console.log('\nSkipped (breaking changes):');
      for (const skip of dryRunResult.skipped) {
        console.log(`  - ${skip.name}: ${skip.version}`);
      }
    }
    console.log();
  } catch (error: any) {
    console.error(`✗ Dry run failed: ${error.message}\n`);
  }

  // Step 3: Apply non-breaking updates
  console.log('Step 3: Applying non-breaking updates...');
  try {
    const result = await updateManager.update({
      skipBreaking: true, // Skip breaking changes
    });

    if (result.success) {
      console.log('✓ Updates applied successfully!\n');

      if (result.updated.length > 0) {
        console.log('Updated packages:');
        for (const update of result.updated) {
          console.log(`  ✓ ${update.name}: ${update.from} → ${update.to}`);
        }
        console.log();
      }

      if (result.skipped.length > 0) {
        console.log('Skipped packages (breaking changes):');
        for (const skip of result.skipped) {
          console.log(`  - ${skip.name}: ${skip.version} (${skip.reason})`);
        }
        console.log();
      }
    } else {
      console.error('✗ Update failed\n');

      if (result.failed.length > 0) {
        console.error('Failed packages:');
        for (const fail of result.failed) {
          console.error(`  ✗ ${fail.name}: ${fail.error}`);
        }
        console.log();
      }
    }
  } catch (error: any) {
    console.error(`✗ Update failed: ${error.message}\n`);
  }

  // Step 4: Apply breaking updates (with confirmation)
  console.log('Step 4: Applying breaking updates...');
  console.log('⚠️  Warning: This may introduce breaking changes!\n');

  try {
    const result = await updateManager.update({
      skipBreaking: false, // Include breaking changes
    });

    if (result.success) {
      console.log('✓ All updates applied (including breaking)!\n');

      // Identify breaking updates
      const breakingUpdates = result.updated.filter((u) => {
        const currentMajor = parseInt(u.from.split('.')[0]);
        const newMajor = parseInt(u.to.split('.')[0]);
        return newMajor > currentMajor;
      });

      if (breakingUpdates.length > 0) {
        console.log('⚠️  Breaking updates applied:');
        for (const update of breakingUpdates) {
          console.log(`  ${update.name}: ${update.from} → ${update.to}`);
        }
        console.log('\n⚠️  Please review migration guides and test your application!\n');
      }
    }
  } catch (error: any) {
    console.error(`✗ Update failed: ${error.message}\n`);
  }

  // Step 5: Update specific packages
  console.log('Step 5: Updating specific packages...');
  const packagesToUpdate = ['my-agent', 'web-search'];

  try {
    const result = await updateManager.update({
      packages: packagesToUpdate,
      skipBreaking: true,
    });

    if (result.success) {
      console.log(`✓ Updated ${packagesToUpdate.join(', ')}\n`);

      for (const update of result.updated) {
        console.log(`  ${update.name}: ${update.from} → ${update.to}`);
      }
      console.log();
    }
  } catch (error: any) {
    console.error(`✗ Failed to update packages: ${error.message}\n`);
  }

  // Step 6: Rollback example
  console.log('Step 6: Rolling back a package...');
  try {
    const packageToRollback = 'my-agent';
    const targetVersion = '1.0.0';

    console.log(`  Rolling back ${packageToRollback} to ${targetVersion}...`);

    await updateManager.rollback(packageToRollback, targetVersion);

    console.log(`✓ Successfully rolled back ${packageToRollback} to ${targetVersion}`);
    console.log();
  } catch (error: any) {
    if (error.code === 'VERSION_NOT_INSTALLED') {
      console.log('  ℹ️  Version not installed (cannot rollback)');
      console.log();
    } else if (error.code === 'MANIFEST_NOT_FOUND') {
      console.log('  ℹ️  Package not found (cannot rollback)');
      console.log();
    } else {
      console.error(`  ✗ Rollback failed: ${error.message}\n`);
    }
  }

  // Step 7: Update with different strategies
  console.log('Step 7: Update strategies...\n');

  // Strategy: Latest (including major versions)
  console.log('Strategy 1: Latest (including breaking changes)');
  try {
    const result = await updateManager.update({
      strategy: 'latest',
      skipBreaking: false,
      dryRun: true,
    });

    console.log(`  Would update ${result.updated.length} packages to latest versions`);
    console.log();
  } catch (error: any) {
    console.error(`  ✗ Failed: ${error.message}\n`);
  }

  // Strategy: Minor (within current major version)
  console.log('Strategy 2: Minor (safe updates within major version)');
  try {
    const result = await updateManager.update({
      strategy: 'minor',
      dryRun: true,
    });

    console.log(`  Would update ${result.updated.length} packages to latest minor versions`);
    console.log();
  } catch (error: any) {
    console.error(`  ✗ Failed: ${error.message}\n`);
  }

  // Strategy: Patch (only patch updates)
  console.log('Strategy 3: Patch (bug fixes only)');
  try {
    const result = await updateManager.update({
      strategy: 'patch',
      dryRun: true,
    });

    console.log(`  Would update ${result.updated.length} packages to latest patches`);
    console.log();
  } catch (error: any) {
    console.error(`  ✗ Failed: ${error.message}\n`);
  }

  console.log('=== Example Complete ===');
}

// Run the example
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
