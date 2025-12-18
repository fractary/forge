/**
 * Update manager for applying package updates
 */

import * as semver from 'semver';
import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import type { DefinitionResolver } from '../resolver';
import type { LockfileManager } from '../lockfile/lockfile-manager';
import type { ManifestManager } from '../manifest/manifest-manager';
import type { UpdateChecker } from './update-checker';
import type {
  UpdateOptions,
  UpdateResult,
  UpdatedPackage,
  FailedUpdate,
  SkippedUpdate,
} from './types';
import { calculateIntegrity } from '../lockfile/integrity';

export class UpdateManager {
  constructor(
    private resolver: DefinitionResolver,
    private lockfileManager: LockfileManager,
    private manifestManager: ManifestManager,
    private updateChecker: UpdateChecker
  ) {}

  /**
   * Apply updates to packages
   */
  async update(options: UpdateOptions = {}): Promise<UpdateResult> {
    const strategy = options.strategy || 'latest';
    const skipBreaking = options.skipBreaking ?? true;

    logger.info(`Updating packages (strategy: ${strategy})...`);

    // Check for available updates
    const checkResult = await this.updateChecker.checkUpdates();

    if (!checkResult.hasUpdates) {
      logger.success('All packages are up to date');
      return {
        success: true,
        updated: [],
        failed: [],
        skipped: [],
      };
    }

    // Filter updates based on options
    let updates = checkResult.updates;

    if (options.packages && options.packages.length > 0) {
      updates = updates.filter((u) => options.packages!.includes(u.name));
    }

    if (skipBreaking) {
      const breaking = updates.filter((u) => u.isBreaking);
      if (breaking.length > 0) {
        logger.warn(`Skipping ${breaking.length} breaking update(s)`);
        logger.info('Use --no-skip-breaking to include breaking changes');
      }
      updates = updates.filter((u) => !u.isBreaking);
    }

    if (updates.length === 0) {
      logger.info('No updates to apply (breaking changes skipped)');
      return {
        success: true,
        updated: [],
        failed: [],
        skipped: checkResult.breakingChanges.map((u) => ({
          name: u.name,
          type: u.type,
          currentVersion: u.currentVersion,
          availableVersion: u.latestVersion,
          reason: 'breaking' as const,
        })),
      };
    }

    if (options.dryRun) {
      logger.info('Dry run - no changes will be made');
      logger.info(`Would update ${updates.length} package(s):`);
      for (const update of updates) {
        logger.info(`  ${update.name}: ${update.currentVersion} → ${update.latestVersion}`);
      }
      return {
        success: true,
        updated: [],
        failed: [],
        skipped: [],
      };
    }

    // Apply updates
    const result: UpdateResult = {
      success: true,
      updated: [],
      failed: [],
      skipped: [],
    };

    const lockfile = await this.lockfileManager.load();

    for (const update of updates) {
      try {
        logger.info(`Updating ${update.name}: ${update.currentVersion} → ${update.latestVersion}`);

        // Resolve new version
        const resolved =
          update.type === 'agent'
            ? await this.resolver.agentResolve(`${update.name}@${update.latestVersion}`)
            : await this.resolver.toolResolve(`${update.name}@${update.latestVersion}`);

        // Calculate new integrity
        const integrity = await calculateIntegrity(resolved.definition);

        // Update lockfile entry
        const entry =
          update.type === 'agent' ? lockfile.agents[update.name] : lockfile.tools[update.name];

        if (entry) {
          entry.version = update.latestVersion;
          entry.integrity = integrity;
          entry.resolved = resolved.source;
        }

        // Update manifest
        const manifest = await this.manifestManager.getManifest(update.name);
        if (manifest) {
          if (!manifest.installed_versions.includes(update.latestVersion)) {
            manifest.installed_versions.push(update.latestVersion);
          }
          manifest.active_version = update.latestVersion;
          manifest.update_available = false;
          await this.manifestManager.saveManifest(manifest);
        }

        result.updated.push({
          name: update.name,
          type: update.type,
          from: update.currentVersion,
          to: update.latestVersion,
          changes: [], // TODO: Extract from changelog
        });

        logger.success(`✓ Updated ${update.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failed.push({
          name: update.name,
          type: update.type,
          version: update.latestVersion,
          error: errorMessage,
        });
        result.success = false;
        logger.error(`✗ Failed to update ${update.name}: ${errorMessage}`);
      }
    }

    // Save updated lockfile
    if (result.updated.length > 0) {
      lockfile.generated = new Date().toISOString();
      await this.lockfileManager.save(lockfile);
      logger.success(`Updated lockfile with ${result.updated.length} package(s)`);
    }

    return result;
  }

  /**
   * Update a specific package
   */
  async updatePackage(
    name: string,
    version?: string,
    options: Omit<UpdateOptions, 'packages'> = {}
  ): Promise<UpdateResult> {
    return this.update({
      ...options,
      packages: [name],
    });
  }

  /**
   * Rollback a package to a previous version
   */
  async rollback(name: string, version: string): Promise<void> {
    logger.info(`Rolling back ${name} to ${version}...`);

    const lockfile = await this.lockfileManager.load();
    const manifest = await this.manifestManager.getManifest(name);

    if (!manifest) {
      throw new ForgeError(
        DefinitionErrorCode.DEFINITION_NOT_FOUND,
        `Manifest not found for ${name}`,
        { name }
      );
    }

    // Check if version is installed
    if (!manifest.installed_versions.includes(version)) {
      throw new ForgeError(
        DefinitionErrorCode.VERSION_NOT_FOUND,
        `Version ${version} not installed for ${name}`,
        { name, version }
      );
    }

    // Resolve the version
    const resolved =
      manifest.type === 'agent'
        ? await this.resolver.agentResolve(`${name}@${version}`)
        : await this.resolver.toolResolve(`${name}@${version}`);

    // Calculate integrity
    const integrity = await calculateIntegrity(resolved.definition);

    // Update lockfile entry
    const entry = manifest.type === 'agent' ? lockfile.agents[name] : lockfile.tools[name];

    if (entry) {
      const previousVersion = entry.version;
      entry.version = version;
      entry.integrity = integrity;
      entry.resolved = resolved.source;

      // Save lockfile
      lockfile.generated = new Date().toISOString();
      await this.lockfileManager.save(lockfile);

      // Update manifest
      manifest.active_version = version;
      await this.manifestManager.saveManifest(manifest);

      logger.success(`Rolled back ${name}: ${previousVersion} → ${version}`);
    } else {
      throw new ForgeError(
        DefinitionErrorCode.DEFINITION_NOT_FOUND,
        `Package ${name} not found in lockfile`,
        { name }
      );
    }
  }
}
