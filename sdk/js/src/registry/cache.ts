/**
 * Registry Manifest Cache
 *
 * Implements TTL-based caching for registry manifests to reduce network requests.
 * Cache location: ~/.fractary/registry/cache/
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type { RegistryManifest } from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Cached manifest entry with metadata
 */
export interface ManifestCache {
  /** Original registry URL */
  url: string;
  /** Cached manifest data */
  manifest: RegistryManifest;
  /** Unix timestamp when fetched (milliseconds) */
  fetched_at: number;
  /** Time-to-live in seconds */
  ttl: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Total number of cached entries */
  total_entries: number;
  /** Number of fresh (valid) entries */
  fresh_entries: number;
  /** Number of expired entries */
  expired_entries: number;
  /** Total cache size in bytes */
  total_size_bytes: number;
  /** Cache directory path */
  cache_dir: string;
}

// ============================================================================
// Cache Manager
// ============================================================================

export class ManifestCacheManager {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    // Default to ~/.fractary/registry/cache/
    this.cacheDir = cacheDir || path.join(os.homedir(), '.fractary', 'registry', 'cache');
  }

  /**
   * Get cache file path for a registry
   */
  private getCachePath(registryName: string): string {
    return path.join(this.cacheDir, `${registryName}.json`);
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    await fs.ensureDir(this.cacheDir);
  }

  /**
   * Get cached manifest if fresh
   * @returns Cached manifest if exists and fresh, null otherwise
   */
  async get(registryName: string): Promise<RegistryManifest | null> {
    try {
      const cachePath = this.getCachePath(registryName);

      if (!await fs.pathExists(cachePath)) {
        return null;
      }

      const cache: ManifestCache = await fs.readJson(cachePath);

      // Check if cache is still fresh
      if (this.isFresh(cache)) {
        return cache.manifest;
      }

      return null;
    } catch (error) {
      // If cache is corrupted or unreadable, treat as miss
      return null;
    }
  }

  /**
   * Store manifest in cache
   */
  async set(
    registryName: string,
    url: string,
    manifest: RegistryManifest,
    ttl: number = 3600
  ): Promise<void> {
    await this.ensureCacheDir();

    const cache: ManifestCache = {
      url,
      manifest,
      fetched_at: Date.now(),
      ttl,
    };

    const cachePath = this.getCachePath(registryName);
    await fs.writeJson(cachePath, cache, { spaces: 2 });
  }

  /**
   * Check if cached entry is fresh (not expired)
   */
  isFresh(cache: ManifestCache): boolean {
    const age = Date.now() - cache.fetched_at;
    const maxAge = cache.ttl * 1000; // Convert seconds to milliseconds
    return age < maxAge;
  }

  /**
   * Get age of cached entry in seconds
   */
  getAge(cache: ManifestCache): number {
    return Math.floor((Date.now() - cache.fetched_at) / 1000);
  }

  /**
   * Invalidate (delete) cache for a registry
   */
  async invalidate(registryName: string): Promise<void> {
    const cachePath = this.getCachePath(registryName);

    if (await fs.pathExists(cachePath)) {
      await fs.remove(cachePath);
    }
  }

  /**
   * Invalidate all cached manifests
   */
  async invalidateAll(): Promise<void> {
    if (await fs.pathExists(this.cacheDir)) {
      await fs.emptyDir(this.cacheDir);
    }
  }

  /**
   * List all cached registry names
   */
  async list(): Promise<string[]> {
    if (!await fs.pathExists(this.cacheDir)) {
      return [];
    }

    const files = await fs.readdir(this.cacheDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  /**
   * Get cache entry with metadata (for inspection)
   */
  async getEntry(registryName: string): Promise<ManifestCache | null> {
    try {
      const cachePath = this.getCachePath(registryName);

      if (!await fs.pathExists(cachePath)) {
        return null;
      }

      return await fs.readJson(cachePath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      total_entries: 0,
      fresh_entries: 0,
      expired_entries: 0,
      total_size_bytes: 0,
      cache_dir: this.cacheDir,
    };

    if (!await fs.pathExists(this.cacheDir)) {
      return stats;
    }

    const files = await fs.readdir(this.cacheDir);

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(this.cacheDir, file);
      const fileStat = await fs.stat(filePath);
      stats.total_size_bytes += fileStat.size;
      stats.total_entries++;

      try {
        const cache: ManifestCache = await fs.readJson(filePath);
        if (this.isFresh(cache)) {
          stats.fresh_entries++;
        } else {
          stats.expired_entries++;
        }
      } catch (error) {
        // Corrupted cache file, count as expired
        stats.expired_entries++;
      }
    }

    return stats;
  }

  /**
   * Clean up expired cache entries
   * @returns Number of entries removed
   */
  async cleanup(): Promise<number> {
    let removed = 0;

    if (!await fs.pathExists(this.cacheDir)) {
      return removed;
    }

    const files = await fs.readdir(this.cacheDir);

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(this.cacheDir, file);

      try {
        const cache: ManifestCache = await fs.readJson(filePath);

        if (!this.isFresh(cache)) {
          await fs.remove(filePath);
          removed++;
        }
      } catch (error) {
        // Corrupted cache file, remove it
        await fs.remove(filePath);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Check if cache exists for a registry
   */
  async has(registryName: string): Promise<boolean> {
    const cachePath = this.getCachePath(registryName);
    return fs.pathExists(cachePath);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default cache manager instance
 */
export const manifestCache = new ManifestCacheManager();
