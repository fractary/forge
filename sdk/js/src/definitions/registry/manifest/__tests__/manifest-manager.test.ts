/**
 * Tests for ManifestManager
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { ManifestManager } from '../manifest-manager';
import type { PackageManifest } from '../types';

// Mock logger
jest.mock('@/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

describe('ManifestManager', () => {
  let manager: ManifestManager;
  let testDir: string;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = path.join(__dirname, '.test-temp', `manifest-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    manager = new ManifestManager(testDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(testDir);
  });

  describe('getManifest', () => {
    it('should return null if manifest does not exist', async () => {
      const manifest = await manager.getManifest('non-existent');
      expect(manifest).toBeNull();
    });

    it('should load existing manifest', async () => {
      const testManifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        versions: [
          {
            version: '1.0.0',
            released: '2024-01-01T00:00:00Z',
            status: 'stable',
          },
        ],
        latest: '1.0.0',
        installed_versions: ['1.0.0'],
        last_checked: '2024-01-01T00:00:00Z',
        update_available: false,
      };

      await manager.saveManifest(testManifest);

      const loaded = await manager.getManifest('test-agent');
      expect(loaded).toEqual(testManifest);
    });

    it('should return null for invalid JSON', async () => {
      const manifestPath = path.join(testDir, 'manifests', 'invalid.json');
      await fs.ensureDir(path.dirname(manifestPath));
      await fs.writeFile(manifestPath, 'invalid json', 'utf-8');

      const manifest = await manager.getManifest('invalid');
      expect(manifest).toBeNull();
    });
  });

  describe('saveManifest', () => {
    it('should save manifest to disk', async () => {
      const testManifest: PackageManifest = {
        name: 'test-tool',
        type: 'tool',
        description: 'Test tool',
        versions: [],
        latest: '1.0.0',
        installed_versions: [],
        last_checked: '2024-01-01T00:00:00Z',
        update_available: false,
      };

      await manager.saveManifest(testManifest);

      const manifestPath = path.join(testDir, 'manifests', 'test-tool.json');
      expect(await fs.pathExists(manifestPath)).toBe(true);

      const content = await fs.readFile(manifestPath, 'utf-8');
      expect(JSON.parse(content)).toEqual(testManifest);
    });

    it('should create manifest directory if it does not exist', async () => {
      const testManifest: PackageManifest = {
        name: 'new-agent',
        type: 'agent',
        description: 'New agent',
        versions: [],
        latest: '1.0.0',
        installed_versions: [],
        last_checked: '2024-01-01T00:00:00Z',
        update_available: false,
      };

      await manager.saveManifest(testManifest);

      const manifestDir = path.join(testDir, 'manifests');
      expect(await fs.pathExists(manifestDir)).toBe(true);
    });
  });

  describe('updateManifest', () => {
    it('should create new manifest if it does not exist', async () => {
      const manifest = await manager.updateManifest('new-agent', 'agent', {
        description: 'A new agent',
        latest: '1.0.0',
      });

      expect(manifest.name).toBe('new-agent');
      expect(manifest.type).toBe('agent');
      expect(manifest.description).toBe('A new agent');
      expect(manifest.latest).toBe('1.0.0');
      expect(manifest.last_checked).toBeTruthy();
    });

    it('should update existing manifest', async () => {
      // Create initial manifest
      await manager.updateManifest('test-agent', 'agent', {
        description: 'Initial description',
        latest: '1.0.0',
      });

      // Update it
      const updated = await manager.updateManifest('test-agent', 'agent', {
        description: 'Updated description',
        latest: '2.0.0',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.latest).toBe('2.0.0');
    });

    it('should preserve existing fields when updating', async () => {
      // Create initial manifest with stockyard info
      await manager.updateManifest('test-agent', 'agent', {
        description: 'Test',
        stockyard: {
          author: 'test-author',
          license: 'MIT',
          homepage: 'https://example.com',
          repository: 'https://github.com/test/repo',
          downloads: 100,
          rating: 5,
          tags: ['test'],
        },
      });

      // Update description only
      const updated = await manager.updateManifest('test-agent', 'agent', {
        description: 'Updated',
      });

      expect(updated.description).toBe('Updated');
      expect(updated.stockyard).toBeDefined();
      expect(updated.stockyard?.author).toBe('test-author');
    });
  });

  describe('trackFork', () => {
    it('should track fork relationship', async () => {
      // Create source manifest
      await manager.updateManifest('original-agent', 'agent', {
        description: 'Original',
      });

      // Track fork
      await manager.trackFork('original-agent', 'forked-agent');

      // Verify fork was added
      const source = await manager.getManifest('original-agent');
      expect(source?.forks).toHaveLength(1);
      expect(source?.forks?.[0].name).toBe('forked-agent');
    });

    it('should throw error if source manifest does not exist', async () => {
      await expect(manager.trackFork('non-existent', 'forked-agent')).rejects.toThrow(
        /Source manifest not found/
      );
    });

    it('should append to existing forks list', async () => {
      // Create source with one fork
      await manager.updateManifest('original-agent', 'agent', {
        description: 'Original',
        forks: [
          {
            name: 'fork-1',
            author: 'user1',
            url: 'local',
          },
        ],
      });

      // Add another fork
      await manager.trackFork('original-agent', 'fork-2');

      // Verify both forks exist
      const source = await manager.getManifest('original-agent');
      expect(source?.forks).toHaveLength(2);
      expect(source?.forks?.map((f) => f.name)).toContain('fork-1');
      expect(source?.forks?.map((f) => f.name)).toContain('fork-2');
    });
  });

  describe('listManifests', () => {
    it('should return empty array if no manifests exist', async () => {
      const manifests = await manager.listManifests();
      expect(manifests).toEqual([]);
    });

    it('should list all manifests', async () => {
      await manager.updateManifest('agent-1', 'agent', { description: 'Agent 1' });
      await manager.updateManifest('agent-2', 'agent', { description: 'Agent 2' });
      await manager.updateManifest('tool-1', 'tool', { description: 'Tool 1' });

      const manifests = await manager.listManifests();
      expect(manifests).toHaveLength(3);
    });

    it('should filter by type', async () => {
      await manager.updateManifest('agent-1', 'agent', { description: 'Agent 1' });
      await manager.updateManifest('agent-2', 'agent', { description: 'Agent 2' });
      await manager.updateManifest('tool-1', 'tool', { description: 'Tool 1' });

      const agents = await manager.listManifests('agent');
      expect(agents).toHaveLength(2);
      expect(agents.every((m) => m.type === 'agent')).toBe(true);

      const tools = await manager.listManifests('tool');
      expect(tools).toHaveLength(1);
      expect(tools.every((m) => m.type === 'tool')).toBe(true);
    });

    it('should ignore non-JSON files', async () => {
      await manager.updateManifest('agent-1', 'agent', { description: 'Agent 1' });

      // Create a non-JSON file
      const manifestDir = manager.getManifestDir();
      await fs.writeFile(path.join(manifestDir, 'readme.txt'), 'test', 'utf-8');

      const manifests = await manager.listManifests();
      expect(manifests).toHaveLength(1);
    });
  });

  describe('deleteManifest', () => {
    it('should delete existing manifest', async () => {
      await manager.updateManifest('test-agent', 'agent', { description: 'Test' });

      expect(await manager.exists('test-agent')).toBe(true);

      await manager.deleteManifest('test-agent');

      expect(await manager.exists('test-agent')).toBe(false);
    });

    it('should not throw if manifest does not exist', async () => {
      await expect(manager.deleteManifest('non-existent')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true if manifest exists', async () => {
      await manager.updateManifest('test-agent', 'agent', { description: 'Test' });

      expect(await manager.exists('test-agent')).toBe(true);
    });

    it('should return false if manifest does not exist', async () => {
      expect(await manager.exists('non-existent')).toBe(false);
    });
  });

  describe('getManifestDir', () => {
    it('should return manifest directory path', () => {
      const dir = manager.getManifestDir();
      expect(dir).toContain('manifests');
      expect(dir).toBe(path.join(testDir, 'manifests'));
    });
  });
});
