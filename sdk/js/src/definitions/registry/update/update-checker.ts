/**
 * Update checker for detecting available updates
 */

import * as semver from 'semver';
import { logger } from '../../../logger';
import type { LockfileManager } from '../lockfile/lockfile-manager';
import type { ManifestManager } from '../manifest/manifest-manager';
import type { UpdateCheckResult, UpdateInfo } from './types';

export class UpdateChecker {
  constructor(
    private lockfileManager: LockfileManager,
    private manifestManager: ManifestManager
  ) {}

  /**
   * Check for available updates
   */
  async checkUpdates(): Promise<UpdateCheckResult> {
    logger.info('Checking for updates...');

    const lockfile = await this.lockfileManager.load();
    const updates: UpdateInfo[] = [];
    const breakingChanges: UpdateInfo[] = [];

    // Check agent updates
    for (const [name, entry] of Object.entries(lockfile.agents)) {
      const manifest = await this.manifestManager.getManifest(name);
      if (!manifest) {
        logger.debug(`No manifest found for agent: ${name}`);
        continue;
      }

      const updateInfo = this.checkPackageUpdate(
        name,
        'agent',
        entry.version,
        manifest.latest
      );

      if (updateInfo) {
        updates.push(updateInfo);
        if (updateInfo.isBreaking) {
          breakingChanges.push(updateInfo);
        }
      }
    }

    // Check tool updates
    for (const [name, entry] of Object.entries(lockfile.tools)) {
      const manifest = await this.manifestManager.getManifest(name);
      if (!manifest) {
        logger.debug(`No manifest found for tool: ${name}`);
        continue;
      }

      const updateInfo = this.checkPackageUpdate(
        name,
        'tool',
        entry.version,
        manifest.latest
      );

      if (updateInfo) {
        updates.push(updateInfo);
        if (updateInfo.isBreaking) {
          breakingChanges.push(updateInfo);
        }
      }
    }

    const result: UpdateCheckResult = {
      hasUpdates: updates.length > 0,
      updates,
      breakingChanges,
      total: updates.length,
    };

    if (result.hasUpdates) {
      logger.info(`Found ${result.total} update(s) available`);
      if (breakingChanges.length > 0) {
        logger.warn(`${breakingChanges.length} update(s) include breaking changes`);
      }
    } else {
      logger.success('All packages are up to date');
    }

    return result;
  }

  /**
   * Check if a specific package has an update
   */
  private checkPackageUpdate(
    name: string,
    type: 'agent' | 'tool',
    currentVersion: string,
    latestVersion: string
  ): UpdateInfo | null {
    // Skip if already at latest
    if (semver.eq(currentVersion, latestVersion)) {
      return null;
    }

    // Skip if current version is greater (shouldn't happen, but safety check)
    if (semver.gt(currentVersion, latestVersion)) {
      logger.warn(`${name}: Current version ${currentVersion} > latest ${latestVersion}`);
      return null;
    }

    // Detect breaking changes (major version bump)
    const isBreaking = semver.major(latestVersion) > semver.major(currentVersion);

    return {
      name,
      type,
      currentVersion,
      latestVersion,
      isBreaking,
    };
  }

  /**
   * Get available versions for a package within a range
   */
  async getAvailableVersions(
    name: string,
    currentVersion: string,
    strategy: 'latest' | 'patch' | 'minor' = 'latest'
  ): Promise<string[]> {
    const manifest = await this.manifestManager.getManifest(name);
    if (!manifest) {
      return [];
    }

    const allVersions = manifest.versions
      .filter(v => v.status === 'stable')
      .map(v => v.version)
      .filter(v => semver.gt(v, currentVersion));

    switch (strategy) {
      case 'patch':
        // Only patch updates (e.g., 1.0.x)
        return allVersions.filter(v =>
          semver.major(v) === semver.major(currentVersion) &&
          semver.minor(v) === semver.minor(currentVersion)
        );

      case 'minor':
        // Minor and patch updates (e.g., 1.x.x)
        return allVersions.filter(v =>
          semver.major(v) === semver.major(currentVersion)
        );

      case 'latest':
      default:
        return allVersions;
    }
  }

  /**
   * Check if an update is a breaking change
   */
  isBreakingChange(from: string, to: string): boolean {
    return semver.major(to) > semver.major(from);
  }

  /**
   * Format update summary for display
   */
  formatUpdateSummary(result: UpdateCheckResult): string {
    if (!result.hasUpdates) {
      return 'All packages are up to date';
    }

    const lines: string[] = [];
    lines.push(`\nAvailable updates (${result.total}):\n`);

    for (const update of result.updates) {
      const emoji = update.isBreaking ? '⚠️ ' : '📦 ';
      const breaking = update.isBreaking ? ' (BREAKING)' : '';
      lines.push(
        `${emoji} ${update.name}: ${update.currentVersion} → ${update.latestVersion}${breaking}`
      );
    }

    if (result.breakingChanges.length > 0) {
      lines.push('');
      lines.push('⚠️  Breaking changes detected!');
      lines.push('Review changelogs before updating.');
    }

    return lines.join('\n');
  }
}
