/**
 * Cache Manager for Forge SDK
 * Unified caching interface
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { logger } from '../logger';
import type { CacheEntry, CacheStats, CacheOptions } from '../types';

export class CacheManager {
  private cacheDir: string;
  private ttl: number;
  private enabled: boolean;

  constructor(options?: CacheOptions) {
    this.cacheDir = options?.dir || path.join(process.env.HOME || '.', '.forge', 'cache');
    this.ttl = options?.ttl || 60 * 60 * 1000; // 1 hour default
    this.enabled = options?.enabled !== false; // enabled by default
  }

  /**
   * Get cached entry if valid
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    const cachePath = this.getCachePath(key);

    try {
      if (await fs.pathExists(cachePath)) {
        const entry: CacheEntry<T> = await fs.readJson(cachePath);

        // Check if expired
        const age = Date.now() - entry.timestamp;
        if (age < this.ttl) {
          logger.debug(`Cache hit: ${key}`);
          return entry.data;
        } else {
          logger.debug(`Cache expired: ${key}`);
          await fs.remove(cachePath);
        }
      }
    } catch (error) {
      logger.debug(`Cache read error for ${key}: ${error}`);
    }

    return null;
  }

  /**
   * Set cache entry
   */
  async set<T>(key: string, data: T): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const cachePath = this.getCachePath(key);

    try {
      await fs.ensureDir(path.dirname(cachePath));

      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
      };

      await fs.writeJson(cachePath, entry);
      logger.debug(`Cached: ${key}`);
    } catch (error) {
      logger.debug(`Cache write error for ${key}: ${error}`);
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    const cachePath = this.getCachePath(key);

    try {
      await fs.remove(cachePath);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.debug(`Cache delete error for ${key}: ${error}`);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await fs.remove(this.cacheDir);
      logger.info('Cache cleared');
    } catch (error) {
      logger.warn(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      entries: 0,
      size: 0,
      oldestEntry: null,
      newestEntry: null,
    };

    try {
      if (!(await fs.pathExists(this.cacheDir))) {
        return stats;
      }

      const files = await this.getAllCacheFiles(this.cacheDir);

      stats.entries = files.length;

      for (const file of files) {
        const fileStat = await fs.stat(file);
        stats.size += fileStat.size;

        if (!stats.oldestEntry || fileStat.mtimeMs < stats.oldestEntry) {
          stats.oldestEntry = fileStat.mtimeMs;
        }

        if (!stats.newestEntry || fileStat.mtimeMs > stats.newestEntry) {
          stats.newestEntry = fileStat.mtimeMs;
        }
      }
    } catch (error) {
      logger.debug(`Failed to get cache stats: ${error}`);
    }

    return stats;
  }

  /**
   * Get all cache files recursively
   */
  private async getAllCacheFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getAllCacheFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return files;
  }

  /**
   * Get cache file path for key
   */
  private getCachePath(key: string): string {
    // Create safe filename from key
    const safeKey = key.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  /**
   * Enable caching
   */
  enable(): void {
    this.enabled = true;
    logger.debug('Cache enabled');
  }

  /**
   * Disable caching
   */
  disable(): void {
    this.enabled = false;
    logger.debug('Cache disabled');
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set TTL
   */
  setTTL(ttl: number): void {
    this.ttl = ttl;
    logger.debug(`Cache TTL set to ${ttl}ms`);
  }

  /**
   * Get TTL
   */
  getTTL(): number {
    return this.ttl;
  }
}
