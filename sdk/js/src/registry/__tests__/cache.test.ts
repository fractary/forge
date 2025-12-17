/**
 * Tests for manifest cache manager
 */

import { vol } from 'memfs';
import { ManifestCacheManager } from '../cache.js';
import type { RegistryManifest } from '../types.js';

// Mock fs-extra to use memfs
jest.mock('fs-extra', () => require('memfs'));

describe('ManifestCacheManager', () => {
  let cacheManager: ManifestCacheManager;
  const testManifest: RegistryManifest = {
    name: 'test-registry',
    version: '1.0.0',
    description: 'Test registry',
    updated: '2025-12-15T12:00:00Z',
    plugins: [],
  };

  beforeEach(() => {
    vol.reset();
    cacheManager = new ManifestCacheManager();
  });

  afterEach(() => {
    vol.reset();
  });

  describe('set and get', () => {
    it('should cache a manifest', async () => {
      await cacheManager.set(
        'test-registry',
        'https://example.com/registry.json',
        testManifest,
        3600
      );

      const cached = await cacheManager.get('test-registry');
      expect(cached).toEqual(testManifest);
    });

    it('should return null for non-existent cache', async () => {
      const cached = await cacheManager.get('non-existent');
      expect(cached).toBeNull();
    });

    it('should return null for expired cache', async () => {
      // Cache with 0 TTL (immediately expired)
      await cacheManager.set('test-registry', 'https://example.com/registry.json', testManifest, 0);

      // Wait a tiny bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cached = await cacheManager.get('test-registry');
      expect(cached).toBeNull();
    });

    it('should return cached manifest if still fresh', async () => {
      // Cache with long TTL
      await cacheManager.set(
        'test-registry',
        'https://example.com/registry.json',
        testManifest,
        10000
      );

      const cached = await cacheManager.get('test-registry');
      expect(cached).toEqual(testManifest);
    });
  });

  describe('invalidate', () => {
    it('should invalidate specific cache entry', async () => {
      await cacheManager.set('test-1', 'https://example.com/1.json', testManifest, 3600);
      await cacheManager.set('test-2', 'https://example.com/2.json', testManifest, 3600);

      await cacheManager.invalidate('test-1');

      const cached1 = await cacheManager.get('test-1');
      const cached2 = await cacheManager.get('test-2');

      expect(cached1).toBeNull();
      expect(cached2).toEqual(testManifest);
    });

    it('should invalidate all cache entries', async () => {
      await cacheManager.set('test-1', 'https://example.com/1.json', testManifest, 3600);
      await cacheManager.set('test-2', 'https://example.com/2.json', testManifest, 3600);

      await cacheManager.invalidateAll();

      const cached1 = await cacheManager.get('test-1');
      const cached2 = await cacheManager.get('test-2');

      expect(cached1).toBeNull();
      expect(cached2).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove expired cache entries', async () => {
      // Fresh entry
      await cacheManager.set('fresh', 'https://example.com/fresh.json', testManifest, 10000);

      // Expired entry
      await cacheManager.set('expired', 'https://example.com/expired.json', testManifest, 0);

      await new Promise((resolve) => setTimeout(resolve, 10));

      await cacheManager.cleanup();

      const fresh = await cacheManager.get('fresh');
      const expired = await cacheManager.get('expired');

      expect(fresh).toEqual(testManifest);
      expect(expired).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await cacheManager.set('test-1', 'https://example.com/1.json', testManifest, 10000);
      await cacheManager.set('test-2', 'https://example.com/2.json', testManifest, 0);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = await cacheManager.getStats();

      expect(stats.total_entries).toBe(2);
      expect(stats.fresh_entries).toBe(1);
      expect(stats.expired_entries).toBe(1);
      expect(stats.total_size_bytes).toBeGreaterThan(0);
    });

    it('should return zero stats for empty cache', async () => {
      const stats = await cacheManager.getStats();

      expect(stats.total_entries).toBe(0);
      expect(stats.fresh_entries).toBe(0);
      expect(stats.expired_entries).toBe(0);
      expect(stats.total_size_bytes).toBe(0);
    });
  });

  describe('isFresh', () => {
    it('should return true for fresh cache', () => {
      const cache = {
        manifest: testManifest,
        url: 'https://example.com/registry.json',
        fetched_at: Date.now(),
        ttl: 3600,
      };

      expect(cacheManager['isFresh'](cache)).toBe(true);
    });

    it('should return false for expired cache', () => {
      const cache = {
        manifest: testManifest,
        url: 'https://example.com/registry.json',
        fetched_at: Date.now() - 10000,
        ttl: 1, // 1 second
      };

      expect(cacheManager['isFresh'](cache)).toBe(false);
    });
  });
});
