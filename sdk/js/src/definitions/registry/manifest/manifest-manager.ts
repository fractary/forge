/**
 * Manifest manager for package metadata
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import type { PackageManifest } from './types';

export class ManifestManager {
  private manifestDir: string;

  constructor(globalRegistryPath?: string) {
    this.manifestDir = path.join(
      globalRegistryPath || path.join(os.homedir(), '.fractary/registry'),
      'manifests'
    );
  }

  /**
   * Get manifest for an agent or tool
   */
  async getManifest(name: string): Promise<PackageManifest | null> {
    const manifestPath = path.join(this.manifestDir, `${name}.json`);

    if (!(await fs.pathExists(manifestPath))) {
      return null;
    }

    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(content) as PackageManifest;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to load manifest for ${name}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Save manifest
   */
  async saveManifest(manifest: PackageManifest): Promise<void> {
    await fs.ensureDir(this.manifestDir);
    const manifestPath = path.join(this.manifestDir, `${manifest.name}.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    logger.debug(`Saved manifest: ${manifest.name}`);
  }

  /**
   * Create or update manifest from definition
   */
  async updateManifest(
    name: string,
    type: 'agent' | 'tool',
    options: Partial<PackageManifest> = {}
  ): Promise<PackageManifest> {
    const existing = await this.getManifest(name);

    const manifest: PackageManifest = {
      name,
      type,
      description: options.description || existing?.description || '',
      versions: options.versions || existing?.versions || [],
      latest: options.latest || existing?.latest || '1.0.0',
      dependencies: options.dependencies || existing?.dependencies,
      stockyard: options.stockyard || existing?.stockyard,
      fork_of: options.fork_of !== undefined ? options.fork_of : existing?.fork_of,
      forks: options.forks || existing?.forks || [],
      installed_versions: options.installed_versions || existing?.installed_versions || [],
      active_version: options.active_version || existing?.active_version,
      last_checked: new Date().toISOString(),
      update_available: false,
    };

    await this.saveManifest(manifest);
    return manifest;
  }

  /**
   * Track fork relationship
   */
  async trackFork(sourceName: string, forkedName: string): Promise<void> {
    const sourceManifest = await this.getManifest(sourceName);
    if (!sourceManifest) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_NOT_FOUND,
        `Source manifest not found: ${sourceName}`,
        { name: sourceName }
      );
    }

    // Add to forks list
    if (!sourceManifest.forks) {
      sourceManifest.forks = [];
    }

    sourceManifest.forks.push({
      name: forkedName,
      author: 'local',
      url: 'local',
    });

    await this.saveManifest(sourceManifest);
    logger.info(`Tracked fork: ${forkedName} from ${sourceName}`);
  }

  /**
   * List all manifests
   */
  async listManifests(type?: 'agent' | 'tool'): Promise<PackageManifest[]> {
    await fs.ensureDir(this.manifestDir);
    const files = await fs.readdir(this.manifestDir);

    const manifests: PackageManifest[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const manifest = await this.getManifest(path.basename(file, '.json'));
      if (manifest && (!type || manifest.type === type)) {
        manifests.push(manifest);
      }
    }

    return manifests;
  }

  /**
   * Delete manifest
   */
  async deleteManifest(name: string): Promise<void> {
    const manifestPath = path.join(this.manifestDir, `${name}.json`);

    if (await fs.pathExists(manifestPath)) {
      await fs.remove(manifestPath);
      logger.debug(`Deleted manifest: ${name}`);
    }
  }

  /**
   * Check if manifest exists
   */
  async exists(name: string): Promise<boolean> {
    const manifestPath = path.join(this.manifestDir, `${name}.json`);
    return await fs.pathExists(manifestPath);
  }

  /**
   * Get manifest directory path
   */
  getManifestDir(): string {
    return this.manifestDir;
  }
}
