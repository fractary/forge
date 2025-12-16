/**
 * Tests for update checker
 */

import { UpdateChecker } from '../update-checker';
import type { LockfileManager } from '../../lockfile/lockfile-manager';
import type { ManifestManager } from '../../manifest/manifest-manager';
import type { Lockfile } from '../../lockfile/types';
import type { PackageManifest } from '../../manifest/types';

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

describe('UpdateChecker', () => {
  let updateChecker: UpdateChecker;
  let mockLockfileManager: jest.Mocked<LockfileManager>;
  let mockManifestManager: jest.Mocked<ManifestManager>;

  beforeEach(() => {
    mockLockfileManager = {
      load: jest.fn(),
    } as any;

    mockManifestManager = {
      getManifest: jest.fn(),
    } as any;

    updateChecker = new UpdateChecker(mockLockfileManager, mockManifestManager);
  });

  describe('checkUpdates', () => {
    it('should detect agent updates', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          'test-agent': {
            version: '1.0.0',
            resolved: 'global',
            integrity: 'sha256-abc123',
          },
        },
        tools: {},
      };

      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        versions: [
          { version: '1.0.0', released: '2025-01-01', status: 'stable' },
          { version: '1.1.0', released: '2025-01-02', status: 'stable' },
        ],
        latest: '1.1.0',
        installed_versions: ['1.0.0'],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: true,
      };

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockResolvedValue(manifest);

      const result = await updateChecker.checkUpdates();

      expect(result.hasUpdates).toBe(true);
      expect(result.total).toBe(1);
      expect(result.updates[0]).toMatchObject({
        name: 'test-agent',
        type: 'agent',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        isBreaking: false,
      });
    });

    it('should detect tool updates', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {},
        tools: {
          'test-tool': {
            version: '2.0.0',
            resolved: 'global',
            integrity: 'sha256-def456',
          },
        },
      };

      const manifest: PackageManifest = {
        name: 'test-tool',
        type: 'tool',
        description: 'Test tool',
        versions: [
          { version: '2.0.0', released: '2025-01-01', status: 'stable' },
          { version: '2.1.0', released: '2025-01-02', status: 'stable' },
        ],
        latest: '2.1.0',
        installed_versions: ['2.0.0'],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: true,
      };

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockResolvedValue(manifest);

      const result = await updateChecker.checkUpdates();

      expect(result.hasUpdates).toBe(true);
      expect(result.total).toBe(1);
      expect(result.updates[0]).toMatchObject({
        name: 'test-tool',
        type: 'tool',
        currentVersion: '2.0.0',
        latestVersion: '2.1.0',
        isBreaking: false,
      });
    });

    it('should detect breaking changes', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          'test-agent': {
            version: '1.0.0',
            resolved: 'global',
            integrity: 'sha256-abc123',
          },
        },
        tools: {},
      };

      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        versions: [
          { version: '1.0.0', released: '2025-01-01', status: 'stable' },
          { version: '2.0.0', released: '2025-01-02', status: 'stable' },
        ],
        latest: '2.0.0',
        installed_versions: ['1.0.0'],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: true,
      };

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockResolvedValue(manifest);

      const result = await updateChecker.checkUpdates();

      expect(result.hasUpdates).toBe(true);
      expect(result.updates[0].isBreaking).toBe(true);
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0]).toMatchObject({
        name: 'test-agent',
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        isBreaking: true,
      });
    });

    it('should return no updates when up to date', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          'test-agent': {
            version: '1.1.0',
            resolved: 'global',
            integrity: 'sha256-abc123',
          },
        },
        tools: {},
      };

      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        versions: [{ version: '1.1.0', released: '2025-01-01', status: 'stable' }],
        latest: '1.1.0',
        installed_versions: ['1.1.0'],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: false,
      };

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockResolvedValue(manifest);

      const result = await updateChecker.checkUpdates();

      expect(result.hasUpdates).toBe(false);
      expect(result.total).toBe(0);
      expect(result.updates).toHaveLength(0);
    });

    it('should skip packages without manifests', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          'test-agent': {
            version: '1.0.0',
            resolved: 'local',
            integrity: 'sha256-abc123',
          },
        },
        tools: {},
      };

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockResolvedValue(null);

      const result = await updateChecker.checkUpdates();

      expect(result.hasUpdates).toBe(false);
      expect(result.total).toBe(0);
    });

    it('should handle multiple updates', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          agent1: { version: '1.0.0', resolved: 'global', integrity: 'sha256-a' },
          agent2: { version: '2.0.0', resolved: 'global', integrity: 'sha256-b' },
        },
        tools: {
          tool1: { version: '1.5.0', resolved: 'global', integrity: 'sha256-c' },
        },
      };

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockImplementation(async (name: string) => {
        const manifests: Record<string, PackageManifest> = {
          agent1: {
            name: 'agent1',
            type: 'agent',
            description: 'Agent 1',
            versions: [
              { version: '1.0.0', released: '2025-01-01', status: 'stable' },
              { version: '1.1.0', released: '2025-01-02', status: 'stable' },
            ],
            latest: '1.1.0',
            installed_versions: ['1.0.0'],
            last_checked: '2025-01-01T00:00:00Z',
            update_available: true,
          },
          agent2: {
            name: 'agent2',
            type: 'agent',
            description: 'Agent 2',
            versions: [
              { version: '2.0.0', released: '2025-01-01', status: 'stable' },
              { version: '3.0.0', released: '2025-01-02', status: 'stable' },
            ],
            latest: '3.0.0',
            installed_versions: ['2.0.0'],
            last_checked: '2025-01-01T00:00:00Z',
            update_available: true,
          },
          tool1: {
            name: 'tool1',
            type: 'tool',
            description: 'Tool 1',
            versions: [
              { version: '1.5.0', released: '2025-01-01', status: 'stable' },
              { version: '1.6.0', released: '2025-01-02', status: 'stable' },
            ],
            latest: '1.6.0',
            installed_versions: ['1.5.0'],
            last_checked: '2025-01-01T00:00:00Z',
            update_available: true,
          },
        };
        return manifests[name] || null;
      });

      const result = await updateChecker.checkUpdates();

      expect(result.hasUpdates).toBe(true);
      expect(result.total).toBe(3);
      expect(result.breakingChanges).toHaveLength(1); // agent2: 2.0.0 → 3.0.0
    });
  });

  describe('getAvailableVersions', () => {
    it('should return all newer versions for latest strategy', async () => {
      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test',
        versions: [
          { version: '1.0.0', released: '2025-01-01', status: 'stable' },
          { version: '1.1.0', released: '2025-01-02', status: 'stable' },
          { version: '2.0.0', released: '2025-01-03', status: 'stable' },
        ],
        latest: '2.0.0',
        installed_versions: [],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: false,
      };

      mockManifestManager.getManifest.mockResolvedValue(manifest);

      const versions = await updateChecker.getAvailableVersions(
        'test-agent',
        '1.0.0',
        'latest'
      );

      expect(versions).toEqual(['1.1.0', '2.0.0']);
    });

    it('should return only patch versions for patch strategy', async () => {
      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test',
        versions: [
          { version: '1.0.0', released: '2025-01-01', status: 'stable' },
          { version: '1.0.1', released: '2025-01-02', status: 'stable' },
          { version: '1.1.0', released: '2025-01-03', status: 'stable' },
          { version: '2.0.0', released: '2025-01-04', status: 'stable' },
        ],
        latest: '2.0.0',
        installed_versions: [],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: false,
      };

      mockManifestManager.getManifest.mockResolvedValue(manifest);

      const versions = await updateChecker.getAvailableVersions(
        'test-agent',
        '1.0.0',
        'patch'
      );

      expect(versions).toEqual(['1.0.1']);
    });

    it('should return minor and patch versions for minor strategy', async () => {
      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test',
        versions: [
          { version: '1.0.0', released: '2025-01-01', status: 'stable' },
          { version: '1.0.1', released: '2025-01-02', status: 'stable' },
          { version: '1.1.0', released: '2025-01-03', status: 'stable' },
          { version: '2.0.0', released: '2025-01-04', status: 'stable' },
        ],
        latest: '2.0.0',
        installed_versions: [],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: false,
      };

      mockManifestManager.getManifest.mockResolvedValue(manifest);

      const versions = await updateChecker.getAvailableVersions(
        'test-agent',
        '1.0.0',
        'minor'
      );

      expect(versions).toEqual(['1.0.1', '1.1.0']);
    });
  });

  describe('isBreakingChange', () => {
    it('should detect major version bumps as breaking', () => {
      expect(updateChecker.isBreakingChange('1.0.0', '2.0.0')).toBe(true);
      expect(updateChecker.isBreakingChange('2.5.3', '3.0.0')).toBe(true);
    });

    it('should not detect minor version bumps as breaking', () => {
      expect(updateChecker.isBreakingChange('1.0.0', '1.1.0')).toBe(false);
      expect(updateChecker.isBreakingChange('2.5.3', '2.6.0')).toBe(false);
    });

    it('should not detect patch version bumps as breaking', () => {
      expect(updateChecker.isBreakingChange('1.0.0', '1.0.1')).toBe(false);
      expect(updateChecker.isBreakingChange('2.5.3', '2.5.4')).toBe(false);
    });
  });

  describe('formatUpdateSummary', () => {
    it('should format update summary correctly', () => {
      const result = {
        hasUpdates: true,
        total: 2,
        updates: [
          {
            name: 'agent1',
            type: 'agent' as const,
            currentVersion: '1.0.0',
            latestVersion: '1.1.0',
            isBreaking: false,
          },
          {
            name: 'agent2',
            type: 'agent' as const,
            currentVersion: '1.0.0',
            latestVersion: '2.0.0',
            isBreaking: true,
          },
        ],
        breakingChanges: [
          {
            name: 'agent2',
            type: 'agent' as const,
            currentVersion: '1.0.0',
            latestVersion: '2.0.0',
            isBreaking: true,
          },
        ],
      };

      const summary = updateChecker.formatUpdateSummary(result);

      expect(summary).toContain('Available updates (2)');
      expect(summary).toContain('agent1: 1.0.0 → 1.1.0');
      expect(summary).toContain('agent2: 1.0.0 → 2.0.0 (BREAKING)');
      expect(summary).toContain('Breaking changes detected');
    });

    it('should handle no updates', () => {
      const result = {
        hasUpdates: false,
        total: 0,
        updates: [],
        breakingChanges: [],
      };

      const summary = updateChecker.formatUpdateSummary(result);

      expect(summary).toBe('All packages are up to date');
    });
  });
});
