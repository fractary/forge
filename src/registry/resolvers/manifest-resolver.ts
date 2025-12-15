/**
 * Manifest Registry Resolver
 *
 * Fetches and caches registry manifests from remote URLs.
 * Supports HTTP(S) manifest-based registries.
 */

import * as crypto from 'crypto';
import type {
  RegistryManifest,
  RegistryConfig,
  PluginManifest,
} from '../types.js';
import { validateRegistryManifest, validatePluginManifest } from '../types.js';
import { ManifestCacheManager } from '../cache.js';

// ============================================================================
// Types
// ============================================================================

export interface FetchOptions {
  /** Force refresh (ignore cache) */
  force?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
}

export interface ManifestFetchResult {
  /** Fetched manifest */
  manifest: RegistryManifest;
  /** Whether manifest was loaded from cache */
  fromCache: boolean;
  /** Age of cached manifest in seconds (if from cache) */
  cacheAge?: number;
}

// ============================================================================
// Manifest Resolver
// ============================================================================

export class ManifestResolver {
  private cache: ManifestCacheManager;

  constructor(cache?: ManifestCacheManager) {
    this.cache = cache || new ManifestCacheManager();
  }

  /**
   * Fetch content from URL
   */
  private async fetchUrl(url: string, timeout: number = 30000): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Forge-Registry-Client/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Verify SHA-256 checksum
   */
  private verifyChecksum(content: string, expectedChecksum: string): boolean {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const actual = `sha256:${hash}`;
    return actual === expectedChecksum;
  }

  /**
   * Fetch registry manifest
   */
  async fetchManifest(
    registry: RegistryConfig,
    options: FetchOptions = {}
  ): Promise<ManifestFetchResult> {
    const { force = false, timeout = 30000 } = options;

    // Check cache first (unless force refresh)
    if (!force) {
      const cached = await this.cache.get(registry.name);
      if (cached) {
        const entry = await this.cache.getEntry(registry.name);
        return {
          manifest: cached,
          fromCache: true,
          cacheAge: entry ? this.cache.getAge(entry) : undefined,
        };
      }
    }

    // Fetch from remote
    const content = await this.fetchUrl(registry.url, timeout);

    // Parse and validate
    let manifest: RegistryManifest;
    try {
      const data = JSON.parse(content);
      manifest = validateRegistryManifest(data);
    } catch (error) {
      throw new Error(
        `Invalid registry manifest from ${registry.url}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Cache the manifest
    const ttl = registry.cache_ttl || 3600;
    await this.cache.set(registry.name, registry.url, manifest, ttl);

    return {
      manifest,
      fromCache: false,
    };
  }

  /**
   * Fetch plugin manifest from URL
   */
  async fetchPluginManifest(
    url: string,
    expectedChecksum?: string,
    options: FetchOptions = {}
  ): Promise<PluginManifest> {
    const { timeout = 30000 } = options;

    // Fetch content
    const content = await this.fetchUrl(url, timeout);

    // Verify checksum if provided
    if (expectedChecksum && !this.verifyChecksum(content, expectedChecksum)) {
      throw new Error(
        `Checksum mismatch for plugin manifest from ${url}\nExpected: ${expectedChecksum}\nActual: sha256:${crypto.createHash('sha256').update(content).digest('hex')}`
      );
    }

    // Parse and validate
    try {
      const data = JSON.parse(content);
      return validatePluginManifest(data);
    } catch (error) {
      throw new Error(
        `Invalid plugin manifest from ${url}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Search for plugin across registries
   */
  async searchPlugin(
    pluginName: string,
    registries: RegistryConfig[]
  ): Promise<{ manifest: RegistryManifest; pluginRef: any; registry: RegistryConfig } | null> {
    // Try each registry in priority order
    for (const registry of registries) {
      if (!registry.enabled) {
        continue;
      }

      try {
        const result = await this.fetchManifest(registry);
        const pluginRef = result.manifest.plugins.find(p => p.name === pluginName);

        if (pluginRef) {
          return {
            manifest: result.manifest,
            pluginRef,
            registry,
          };
        }
      } catch (error) {
        // Continue to next registry on error
        console.warn(`Failed to fetch from registry ${registry.name}:`, error);
      }
    }

    return null;
  }

  /**
   * Get all plugins from all enabled registries
   */
  async getAllPlugins(
    registries: RegistryConfig[]
  ): Promise<Array<{ pluginRef: any; registry: RegistryConfig }>> {
    const allPlugins: Array<{ pluginRef: any; registry: RegistryConfig }> = [];

    for (const registry of registries) {
      if (!registry.enabled) {
        continue;
      }

      try {
        const result = await this.fetchManifest(registry);

        for (const pluginRef of result.manifest.plugins) {
          allPlugins.push({ pluginRef, registry });
        }
      } catch (error) {
        // Continue to next registry on error
        console.warn(`Failed to fetch from registry ${registry.name}:`, error);
      }
    }

    return allPlugins;
  }

  /**
   * Refresh manifest cache for a registry
   */
  async refresh(registry: RegistryConfig): Promise<void> {
    await this.fetchManifest(registry, { force: true });
  }

  /**
   * Invalidate cache for a registry
   */
  async invalidate(registryName: string): Promise<void> {
    await this.cache.invalidate(registryName);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupCache() {
    return this.cache.cleanup();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default manifest resolver instance
 */
export const manifestResolver = new ManifestResolver();
