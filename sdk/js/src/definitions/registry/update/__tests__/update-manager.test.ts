/**
 * Tests for update manager
 */

import { UpdateManager } from '../update-manager';
import type { DefinitionResolver } from '../../resolver';
import type { LockfileManager } from '../../lockfile/lockfile-manager';
import type { ManifestManager } from '../../manifest/manifest-manager';
import type { UpdateChecker } from '../update-checker';
import type { Lockfile } from '../../lockfile/types';
import type { PackageManifest } from '../../manifest/types';
import type { ResolvedAgent, ResolvedTool } from '../../types';

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

// Mock integrity calculation
jest.mock('../../lockfile/integrity', () => ({
  calculateIntegrity: jest.fn().mockResolvedValue('sha256-new123'),
}));

describe('UpdateManager', () => {
  let updateManager: UpdateManager;
  let mockResolver: jest.Mocked<DefinitionResolver>;
  let mockLockfileManager: jest.Mocked<LockfileManager>;
  let mockManifestManager: jest.Mocked<ManifestManager>;
  let mockUpdateChecker: jest.Mocked<UpdateChecker>;

  beforeEach(() => {
    mockResolver = {
      agentResolve: jest.fn(),
      toolResolve: jest.fn(),
    } as any;

    mockLockfileManager = {
      load: jest.fn(),
      save: jest.fn(),
    } as any;

    mockManifestManager = {
      getManifest: jest.fn(),
      saveManifest: jest.fn(),
    } as any;

    mockUpdateChecker = {
      checkUpdates: jest.fn(),
    } as any;

    updateManager = new UpdateManager(
      mockResolver,
      mockLockfileManager,
      mockManifestManager,
      mockUpdateChecker
    );
  });

  describe('update', () => {
    it('should update packages successfully', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          'test-agent': {
            version: '1.0.0',
            resolved: 'global',
            integrity: 'sha256-old123',
          },
        },
        tools: {},
      };

      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        versions: [],
        latest: '1.1.0',
        installed_versions: ['1.0.0'],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: true,
      };

      const resolvedAgent: ResolvedAgent = {
        definition: { name: 'test-agent', version: '1.1.0' } as any,
        source: 'global',
        version: '1.1.0',
        path: '/path/to/agent',
      };

      mockUpdateChecker.checkUpdates.mockResolvedValue({
        hasUpdates: true,
        total: 1,
        updates: [
          {
            name: 'test-agent',
            type: 'agent',
            currentVersion: '1.0.0',
            latestVersion: '1.1.0',
            isBreaking: false,
          },
        ],
        breakingChanges: [],
      });

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockResolvedValue(manifest);
      mockResolver.agentResolve.mockResolvedValue(resolvedAgent);

      const result = await updateManager.update();

      expect(result.success).toBe(true);
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0]).toMatchObject({
        name: 'test-agent',
        type: 'agent',
        from: '1.0.0',
        to: '1.1.0',
      });

      expect(mockLockfileManager.save).toHaveBeenCalled();
      expect(mockManifestManager.saveManifest).toHaveBeenCalled();
    });

    it('should skip breaking changes by default', async () => {
      mockUpdateChecker.checkUpdates.mockResolvedValue({
        hasUpdates: true,
        total: 1,
        updates: [
          {
            name: 'test-agent',
            type: 'agent',
            currentVersion: '1.0.0',
            latestVersion: '2.0.0',
            isBreaking: true,
          },
        ],
        breakingChanges: [
          {
            name: 'test-agent',
            type: 'agent',
            currentVersion: '1.0.0',
            latestVersion: '2.0.0',
            isBreaking: true,
          },
        ],
      });

      const result = await updateManager.update();

      expect(result.success).toBe(true);
      expect(result.updated).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('breaking');
    });

    it('should include breaking changes when skipBreaking is false', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          'test-agent': {
            version: '1.0.0',
            resolved: 'global',
            integrity: 'sha256-old123',
          },
        },
        tools: {},
      };

      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test',
        versions: [],
        latest: '2.0.0',
        installed_versions: ['1.0.0'],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: true,
      };

      const resolvedAgent: ResolvedAgent = {
        definition: { name: 'test-agent', version: '2.0.0' } as any,
        source: 'global',
        version: '2.0.0',
        path: '/path/to/agent',
      };

      mockUpdateChecker.checkUpdates.mockResolvedValue({
        hasUpdates: true,
        total: 1,
        updates: [
          {
            name: 'test-agent',
            type: 'agent',
            currentVersion: '1.0.0',
            latestVersion: '2.0.0',
            isBreaking: true,
          },
        ],
        breakingChanges: [
          {
            name: 'test-agent',
            type: 'agent',
            currentVersion: '1.0.0',
            latestVersion: '2.0.0',
            isBreaking: true,
          },
        ],
      });

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockResolvedValue(manifest);
      mockResolver.agentResolve.mockResolvedValue(resolvedAgent);

      const result = await updateManager.update({ skipBreaking: false });

      expect(result.success).toBe(true);
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].to).toBe('2.0.0');
    });

    it('should handle update failures', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          'test-agent': {
            version: '1.0.0',
            resolved: 'global',
            integrity: 'sha256-old123',
          },
        },
        tools: {},
      };

      mockUpdateChecker.checkUpdates.mockResolvedValue({
        hasUpdates: true,
        total: 1,
        updates: [
          {
            name: 'test-agent',
            type: 'agent',
            currentVersion: '1.0.0',
            latestVersion: '1.1.0',
            isBreaking: false,
          },
        ],
        breakingChanges: [],
      });

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockResolver.agentResolve.mockRejectedValue(new Error('Network error'));

      const result = await updateManager.update();

      expect(result.success).toBe(false);
      expect(result.updated).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toMatchObject({
        name: 'test-agent',
        error: 'Network error',
      });
    });

    it('should handle dry run mode', async () => {
      mockUpdateChecker.checkUpdates.mockResolvedValue({
        hasUpdates: true,
        total: 1,
        updates: [
          {
            name: 'test-agent',
            type: 'agent',
            currentVersion: '1.0.0',
            latestVersion: '1.1.0',
            isBreaking: false,
          },
        ],
        breakingChanges: [],
      });

      const result = await updateManager.update({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.updated).toHaveLength(0);
      expect(mockLockfileManager.save).not.toHaveBeenCalled();
    });

    it('should update specific packages only', async () => {
      mockUpdateChecker.checkUpdates.mockResolvedValue({
        hasUpdates: true,
        total: 2,
        updates: [
          {
            name: 'agent1',
            type: 'agent',
            currentVersion: '1.0.0',
            latestVersion: '1.1.0',
            isBreaking: false,
          },
          {
            name: 'agent2',
            type: 'agent',
            currentVersion: '2.0.0',
            latestVersion: '2.1.0',
            isBreaking: false,
          },
        ],
        breakingChanges: [],
      });

      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          agent1: { version: '1.0.0', resolved: 'global', integrity: 'sha256-a' },
          agent2: { version: '2.0.0', resolved: 'global', integrity: 'sha256-b' },
        },
        tools: {},
      };

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockResolvedValue({
        name: 'agent1',
        type: 'agent',
        description: 'Test',
        versions: [],
        latest: '1.1.0',
        installed_versions: ['1.0.0'],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: true,
      });

      mockResolver.agentResolve.mockResolvedValue({
        definition: { name: 'agent1', version: '1.1.0' } as any,
        source: 'global',
        version: '1.1.0',
        path: '/path',
      });

      const result = await updateManager.update({ packages: ['agent1'] });

      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].name).toBe('agent1');
    });

    it('should return success when no updates available', async () => {
      mockUpdateChecker.checkUpdates.mockResolvedValue({
        hasUpdates: false,
        total: 0,
        updates: [],
        breakingChanges: [],
      });

      const result = await updateManager.update();

      expect(result.success).toBe(true);
      expect(result.updated).toHaveLength(0);
    });
  });

  describe('updatePackage', () => {
    it('should update a specific package', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          'test-agent': {
            version: '1.0.0',
            resolved: 'global',
            integrity: 'sha256-old123',
          },
        },
        tools: {},
      };

      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test',
        versions: [],
        latest: '1.1.0',
        installed_versions: ['1.0.0'],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: true,
      };

      mockUpdateChecker.checkUpdates.mockResolvedValue({
        hasUpdates: true,
        total: 1,
        updates: [
          {
            name: 'test-agent',
            type: 'agent',
            currentVersion: '1.0.0',
            latestVersion: '1.1.0',
            isBreaking: false,
          },
        ],
        breakingChanges: [],
      });

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockResolvedValue(manifest);
      mockResolver.agentResolve.mockResolvedValue({
        definition: { name: 'test-agent', version: '1.1.0' } as any,
        source: 'global',
        version: '1.1.0',
        path: '/path',
      });

      const result = await updateManager.updatePackage('test-agent');

      expect(result.success).toBe(true);
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].name).toBe('test-agent');
    });
  });

  describe('rollback', () => {
    it('should rollback to a previous version', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: '2025-01-01T00:00:00Z',
        agents: {
          'test-agent': {
            version: '1.1.0',
            resolved: 'global',
            integrity: 'sha256-new123',
          },
        },
        tools: {},
      };

      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test',
        versions: [],
        latest: '1.1.0',
        installed_versions: ['1.0.0', '1.1.0'],
        active_version: '1.1.0',
        last_checked: '2025-01-01T00:00:00Z',
        update_available: false,
      };

      mockLockfileManager.load.mockResolvedValue(lockfile);
      mockManifestManager.getManifest.mockResolvedValue(manifest);
      mockResolver.agentResolve.mockResolvedValue({
        definition: { name: 'test-agent', version: '1.0.0' } as any,
        source: 'global',
        version: '1.0.0',
        path: '/path',
      });

      await updateManager.rollback('test-agent', '1.0.0');

      expect(mockLockfileManager.save).toHaveBeenCalled();
      expect(mockManifestManager.saveManifest).toHaveBeenCalled();

      const savedLockfile = mockLockfileManager.save.mock.calls[0][0];
      expect(savedLockfile.agents['test-agent'].version).toBe('1.0.0');
    });

    it('should throw error if version not installed', async () => {
      const manifest: PackageManifest = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test',
        versions: [],
        latest: '1.1.0',
        installed_versions: ['1.1.0'],
        last_checked: '2025-01-01T00:00:00Z',
        update_available: false,
      };

      mockManifestManager.getManifest.mockResolvedValue(manifest);

      await expect(updateManager.rollback('test-agent', '1.0.0')).rejects.toThrow(
        'Version 1.0.0 not installed'
      );
    });

    it('should throw error if manifest not found', async () => {
      mockManifestManager.getManifest.mockResolvedValue(null);

      await expect(updateManager.rollback('test-agent', '1.0.0')).rejects.toThrow(
        'Manifest not found'
      );
    });
  });
});
