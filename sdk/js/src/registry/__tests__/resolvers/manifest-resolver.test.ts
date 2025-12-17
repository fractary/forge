/**
 * Tests for manifest resolver
 */

import { ManifestResolver } from '../../resolvers/manifest-resolver.js';
import { ManifestCacheManager } from '../../cache.js';
import type { RegistryConfig, RegistryManifest, PluginManifest } from '../../types.js';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ManifestResolver', () => {
  let resolver: ManifestResolver;
  let mockCache: jest.Mocked<ManifestCacheManager>;

  const testRegistry: RegistryConfig = {
    name: 'test-registry',
    type: 'manifest',
    url: 'https://example.com/registry.json',
    enabled: true,
    priority: 1,
    cache_ttl: 3600,
  };

  const testRegistryManifest: RegistryManifest = {
    name: 'test-registry',
    version: '1.0.0',
    description: 'Test registry',
    updated: '2025-12-15T12:00:00Z',
    plugins: [
      {
        name: '@test/plugin',
        version: '1.0.0',
        description: 'Test plugin',
        url: 'https://example.com/plugin.json',
        checksum: 'sha256:abc123',
      },
    ],
  };

  const testPluginManifest: PluginManifest = {
    name: '@test/plugin',
    version: '1.0.0',
    description: 'Test plugin',
    agents: [
      {
        name: 'test-agent',
        version: '1.0.0',
        description: 'Test agent',
        url: 'https://example.com/agent.yaml',
        checksum: 'sha256:def456',
      },
    ],
    config: {
      author: 'Test',
      repository: 'https://github.com/test/plugin',
      license: 'MIT',
    },
  };

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      cleanup: jest.fn(),
      getStats: jest.fn(),
      isFresh: jest.fn(),
    } as any;

    resolver = new ManifestResolver(mockCache);
    mockFetch.mockReset();
  });

  describe('fetchManifest', () => {
    it('should fetch registry manifest from URL', async () => {
      mockCache.get.mockResolvedValue(null);

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(testRegistryManifest),
      } as any);

      const result = await resolver.fetchManifest(testRegistry);

      expect(result.manifest).toEqual(testRegistryManifest);
      expect(result.fromCache).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        testRegistry.url,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should return cached manifest if available and not force', async () => {
      mockCache.get.mockResolvedValue(testRegistryManifest);

      const result = await resolver.fetchManifest(testRegistry);

      expect(result.manifest).toEqual(testRegistryManifest);
      expect(result.fromCache).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch fresh manifest when force option is true', async () => {
      mockCache.get.mockResolvedValue(testRegistryManifest);

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(testRegistryManifest),
      } as any);

      const result = await resolver.fetchManifest(testRegistry, { force: true });

      expect(result.fromCache).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should cache fetched manifest', async () => {
      mockCache.get.mockResolvedValue(null);

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(testRegistryManifest),
      } as any);

      await resolver.fetchManifest(testRegistry);

      expect(mockCache.set).toHaveBeenCalledWith(
        testRegistry.name,
        testRegistry.url,
        testRegistryManifest,
        testRegistry.cache_ttl
      );
    });

    it('should throw on HTTP error', async () => {
      mockCache.get.mockResolvedValue(null);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      await expect(resolver.fetchManifest(testRegistry)).rejects.toThrow('HTTP 404');
    });

    it('should throw on network error', async () => {
      mockCache.get.mockResolvedValue(null);

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(resolver.fetchManifest(testRegistry)).rejects.toThrow('Network error');
    });

    it('should respect timeout option', async () => {
      mockCache.get.mockResolvedValue(null);

      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              text: async () => JSON.stringify(testRegistryManifest),
            } as any);
          }, 10000); // Long timeout
        });
      });

      await expect(resolver.fetchManifest(testRegistry, { timeout: 100 })).rejects.toThrow();
    });

    it('should validate fetched manifest schema', async () => {
      mockCache.get.mockResolvedValue(null);

      const invalidManifest = {
        name: 'test',
        version: 'invalid', // Should be semver
        description: 'Test',
        updated: '2025-12-15T12:00:00Z',
        plugins: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(invalidManifest),
      } as any);

      await expect(resolver.fetchManifest(testRegistry)).rejects.toThrow();
    });
  });

  describe('fetchPluginManifest', () => {
    it('should fetch plugin manifest from URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(testPluginManifest),
      } as any);

      const result = await resolver.fetchPluginManifest('https://example.com/plugin.json');

      expect(result).toEqual(testPluginManifest);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/plugin.json', expect.any(Object));
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      await expect(resolver.fetchPluginManifest('https://example.com/plugin.json')).rejects.toThrow(
        'HTTP 404'
      );
    });

    it('should validate plugin manifest schema', async () => {
      const invalidManifest = {
        name: 'invalid-name', // Should be @org/name
        version: '1.0.0',
        description: 'Test',
        config: {
          author: 'Test',
          repository: 'https://github.com/test/test',
          license: 'MIT',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(invalidManifest),
      } as any);

      await expect(
        resolver.fetchPluginManifest('https://example.com/plugin.json')
      ).rejects.toThrow();
    });
  });

  describe('fetchFile', () => {
    it('should fetch file from URL', async () => {
      const fileContent = 'test file content';

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => fileContent,
      } as any);

      const result = await resolver.fetchFile('https://example.com/file.yaml');

      expect(result).toBe(fileContent);
    });

    it('should verify checksum if provided', async () => {
      const fileContent = 'test';
      const correctChecksum =
        'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => fileContent,
      } as any);

      const result = await resolver.fetchFile('https://example.com/file.yaml', correctChecksum);

      expect(result).toBe(fileContent);
    });

    it('should throw on checksum mismatch', async () => {
      const fileContent = 'test';
      const wrongChecksum = 'sha256:wrong';

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => fileContent,
      } as any);

      await expect(
        resolver.fetchFile('https://example.com/file.yaml', wrongChecksum)
      ).rejects.toThrow('Checksum verification failed');
    });
  });
});
