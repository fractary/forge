/**
 * Local Resolver for Forge Assets
 * Handles embedded and local filesystem assets
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../../logger';
import { ForgeError, ErrorCode } from '../../errors';
import type { BundleManifest, StarterManifest, AssetPackage } from '../../types';

export interface LocalResolverOptions {
  embeddedPath?: string;
}

export class LocalResolver {
  private embeddedPath: string;

  constructor(options: LocalResolverOptions = {}) {
    this.embeddedPath = options.embeddedPath || path.join(__dirname, '..', '..', '..', 'embedded');
  }

  /**
   * Resolve asset from local filesystem or embedded assets
   */
  async resolve(identifier: string, type?: 'bundle' | 'starter'): Promise<AssetPackage> {
    logger.debug(`Attempting local resolution: ${identifier}`);

    // Try as file path first
    if (identifier.startsWith('file://') || identifier.startsWith('/') || identifier.startsWith('.')) {
      return this.resolveFromPath(identifier, type);
    }

    // Try embedded assets
    return this.resolveFromEmbedded(identifier, type);
  }

  /**
   * Resolve from file path
   */
  private async resolveFromPath(filePath: string, type?: 'bundle' | 'starter'): Promise<AssetPackage> {
    const assetPath = filePath.replace('file://', '');

    if (!(await fs.pathExists(assetPath))) {
      throw new ForgeError(ErrorCode.ASSET_NOT_FOUND, `Asset not found: ${assetPath}`);
    }

    const assetType = type || this.inferAssetType(assetPath);

    // Load manifest
    const manifestPath = await this.findManifest(assetPath, assetType);
    if (!manifestPath) {
      throw new ForgeError(ErrorCode.MANIFEST_NOT_FOUND, `Manifest not found in: ${assetPath}`);
    }

    const manifest = (await fs.readJson(manifestPath)) as BundleManifest | StarterManifest;

    // Load all files
    const files = new Map<string, Buffer>();
    const manifestDir = path.dirname(manifestPath);

    await this.loadFiles(manifestDir, files);

    return {
      manifest,
      files,
      metadata: {
        version: manifest.version || 'local',
        commit: 'local',
        timestamp: new Date(),
        source: `file://${assetPath}`,
        resolver: 'local',
      },
    };
  }

  /**
   * Resolve from embedded assets
   */
  private async resolveFromEmbedded(
    identifier: string,
    type?: 'bundle' | 'starter'
  ): Promise<AssetPackage> {
    logger.debug(`Attempting embedded resolution: ${identifier}`);
    logger.warn('Using embedded asset - consider migrating to GitHub repositories');

    // Determine asset type and path
    const assetType = type || this.inferAssetType(identifier);
    const assetPath = path.join(
      this.embeddedPath,
      assetType === 'starter' ? 'starters' : 'bundles',
      identifier
    );

    if (!(await fs.pathExists(assetPath))) {
      throw new ForgeError(ErrorCode.ASSET_NOT_FOUND, `Embedded asset not found: ${identifier}`);
    }

    // Load manifest
    const manifestPath = path.join(
      assetPath,
      assetType === 'starter' ? 'starter.manifest.json' : 'bundle.manifest.json'
    );

    if (!(await fs.pathExists(manifestPath))) {
      throw new ForgeError(ErrorCode.MANIFEST_NOT_FOUND, `Manifest not found: ${manifestPath}`);
    }

    const manifest = (await fs.readJson(manifestPath)) as BundleManifest | StarterManifest;

    // Load all files
    const files = new Map<string, Buffer>();

    const assetsDir = assetType === 'starter' ? assetPath : path.join(assetPath, 'assets');
    if (await fs.pathExists(assetsDir)) {
      await this.loadFiles(assetsDir, files);
    }

    return {
      manifest,
      files,
      metadata: {
        version: manifest.version || 'embedded',
        commit: 'embedded',
        timestamp: new Date(),
        source: `embedded:${identifier}`,
        resolver: 'local',
      },
    };
  }

  /**
   * Load files recursively from directory
   */
  private async loadFiles(dir: string, files: Map<string, Buffer>, prefix = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(prefix, entry.name);

      if (entry.isDirectory()) {
        await this.loadFiles(fullPath, files, relativePath);
      } else if (entry.isFile() && !entry.name.endsWith('.manifest.json')) {
        const content = await fs.readFile(fullPath);
        files.set(relativePath, content);
      }
    }
  }

  /**
   * Find manifest file in directory
   */
  private async findManifest(assetPath: string, type: 'bundle' | 'starter'): Promise<string | null> {
    const manifestNames = [
      type === 'starter' ? 'starter.manifest.json' : 'bundle.manifest.json',
      'forge.manifest.json',
      'manifest.json',
    ];

    for (const name of manifestNames) {
      const manifestPath = path.join(assetPath, name);
      if (await fs.pathExists(manifestPath)) {
        return manifestPath;
      }
    }

    return null;
  }

  /**
   * Infer asset type from identifier or path
   */
  private inferAssetType(identifier: string): 'bundle' | 'starter' {
    if (
      identifier.includes('starter') ||
      identifier.includes('template') ||
      identifier.includes('scaffold')
    ) {
      return 'starter';
    }
    return 'bundle';
  }

  /**
   * Set embedded path
   */
  setEmbeddedPath(embeddedPath: string): void {
    this.embeddedPath = embeddedPath;
  }

  /**
   * Get embedded path
   */
  getEmbeddedPath(): string {
    return this.embeddedPath;
  }
}
