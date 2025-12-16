/**
 * Tests for installer
 */

import { vol } from 'memfs';
import { Installer } from '../installer.js';
import { Resolver } from '../resolver.js';
import { ManifestResolver } from '../resolvers/manifest-resolver.js';
import type { PluginManifest } from '../types.js';

// Mock fs-extra to use memfs
jest.mock('fs-extra', () => require('memfs'));

// Mock os.homedir()
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: () => '/home/user',
}));

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Installer', () => {
  let installer: Installer;
  let mockResolver: jest.Mocked<Resolver>;
  let mockManifestResolver: jest.Mocked<ManifestResolver>;

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
        checksum: 'sha256:f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2', // SHA-256 of 'agent content'
      },
    ],
    tools: [
      {
        name: 'test-tool',
        version: '1.0.0',
        description: 'Test tool',
        url: 'https://example.com/tool.yaml',
        checksum: 'sha256:d3486ae9136e7856bc42212385ea797094475802c198cbfc3c2e6c6d45d4e2c0', // SHA-256 of 'tool content'
      },
    ],
    config: {
      author: 'Test',
      repository: 'https://github.com/test/plugin',
      license: 'MIT',
    },
  };

  beforeEach(() => {
    vol.reset();
    jest.spyOn(process, 'cwd').mockReturnValue('/project');

    mockResolver = {
      resolvePlugin: jest.fn(),
    } as any;

    mockManifestResolver = {
      fetchPluginManifest: jest.fn(),
      fetchFile: jest.fn(),
    } as any;

    installer = new Installer(mockResolver, mockManifestResolver);

    // Setup directory structure
    vol.mkdirSync('/project/.fractary', { recursive: true });
    vol.mkdirSync('/home/user/.fractary/registry', { recursive: true });

    mockFetch.mockReset();
  });

  afterEach(() => {
    vol.reset();
    jest.restoreAllMocks();
  });

  describe('installPlugin', () => {
    it('should install plugin to local scope', async () => {
      mockResolver.resolvePlugin.mockResolvedValue({
        name: '@test/plugin',
        version: '1.0.0',
        url: 'https://example.com/plugin.json',
        source: 'remote',
      });

      mockManifestResolver.fetchPluginManifest.mockResolvedValue(testPluginManifest);
      mockManifestResolver.fetchFile
        .mockResolvedValueOnce('agent content') // For agent
        .mockResolvedValueOnce('tool content'); // For tool

      const result = await installer.installPlugin('@test/plugin', {
        scope: 'local',
      });

      expect(result.plugin.name).toBe('@test/plugin');
      expect(result.plugin.version).toBe('1.0.0');
      expect(result.installed.agents).toBe(1);
      expect(result.installed.tools).toBe(1);
      expect(result.installPath).toContain('.fractary');

      // Verify files were written
      expect(vol.existsSync('/project/.fractary/agents/@test/plugin')).toBe(true);
      expect(vol.existsSync('/project/.fractary/tools/@test/plugin')).toBe(true);
    });

    it('should install plugin to global scope', async () => {
      mockResolver.resolvePlugin.mockResolvedValue({
        name: '@test/plugin',
        version: '1.0.0',
        url: 'https://example.com/plugin.json',
        source: 'remote',
      });

      mockManifestResolver.fetchPluginManifest.mockResolvedValue(testPluginManifest);
      mockManifestResolver.fetchFile
        .mockResolvedValueOnce('agent content')
        .mockResolvedValueOnce('tool content');

      const result = await installer.installPlugin('@test/plugin', {
        scope: 'global',
      });

      expect(result.installPath).toContain('.fractary/registry');

      // Verify files were written to global
      expect(vol.existsSync('/home/user/.fractary/registry/agents/@test/plugin')).toBe(true);
      expect(vol.existsSync('/home/user/.fractary/registry/tools/@test/plugin')).toBe(true);
    });

    it('should filter components by type (agents only)', async () => {
      mockResolver.resolvePlugin.mockResolvedValue({
        name: '@test/plugin',
        version: '1.0.0',
        url: 'https://example.com/plugin.json',
        source: 'remote',
      });

      mockManifestResolver.fetchPluginManifest.mockResolvedValue(testPluginManifest);
      mockManifestResolver.fetchFile.mockResolvedValue('agent content');

      const result = await installer.installPlugin('@test/plugin', {
        scope: 'local',
        agentsOnly: true,
      });

      expect(result.installed.agents).toBe(1);
      expect(result.installed.tools).toBe(0);
    });

    it('should skip components if noHooks is true', async () => {
      const manifestWithHooks: PluginManifest = {
        ...testPluginManifest,
        hooks: [
          {
            name: 'test-hook',
            version: '1.0.0',
            description: 'Test hook',
            url: 'https://example.com/hook.yaml',
            checksum: 'sha256:abc123',
            event: 'pre-commit',
          },
        ],
      };

      mockResolver.resolvePlugin.mockResolvedValue({
        name: '@test/plugin',
        version: '1.0.0',
        url: 'https://example.com/plugin.json',
        source: 'remote',
      });

      mockManifestResolver.fetchPluginManifest.mockResolvedValue(manifestWithHooks);
      mockManifestResolver.fetchFile.mockResolvedValue('content');

      const result = await installer.installPlugin('@test/plugin', {
        scope: 'local',
        noHooks: true,
      });

      expect(result.installed.hooks).toBe(0);
    });

    it('should perform dry run without writing files', async () => {
      mockResolver.resolvePlugin.mockResolvedValue({
        name: '@test/plugin',
        version: '1.0.0',
        url: 'https://example.com/plugin.json',
        source: 'remote',
      });

      mockManifestResolver.fetchPluginManifest.mockResolvedValue(testPluginManifest);
      mockManifestResolver.fetchFile.mockResolvedValue('content');

      const result = await installer.installPlugin('@test/plugin', {
        scope: 'local',
        dryRun: true,
      });

      expect(result.installed.agents).toBe(1);
      expect(result.installed.tools).toBe(1);

      // Verify files were NOT written
      expect(vol.existsSync('/project/.fractary/agents/@test/plugin')).toBe(false);
    });

    it('should skip reinstall if already installed and force is false', async () => {
      // Pre-install the plugin
      vol.mkdirSync('/project/.fractary/agents/@test/plugin', { recursive: true });
      vol.writeFileSync(
        '/project/.fractary/agents/@test/plugin/plugin.json',
        JSON.stringify(testPluginManifest)
      );

      mockResolver.resolvePlugin.mockResolvedValue({
        name: '@test/plugin',
        version: '1.0.0',
        url: 'https://example.com/plugin.json',
        source: 'remote',
      });

      const result = await installer.installPlugin('@test/plugin', {
        scope: 'local',
        force: false,
      });

      expect(result.skipped).toBe(true);
      expect(mockManifestResolver.fetchPluginManifest).not.toHaveBeenCalled();
    });

    it('should reinstall if force is true', async () => {
      // Pre-install the plugin
      vol.mkdirSync('/project/.fractary/agents/@test/plugin', { recursive: true });
      vol.writeFileSync(
        '/project/.fractary/agents/@test/plugin/plugin.json',
        JSON.stringify(testPluginManifest)
      );

      mockResolver.resolvePlugin.mockResolvedValue({
        name: '@test/plugin',
        version: '1.0.0',
        url: 'https://example.com/plugin.json',
        source: 'remote',
      });

      mockManifestResolver.fetchPluginManifest.mockResolvedValue(testPluginManifest);
      mockManifestResolver.fetchFile.mockResolvedValue('content');

      const result = await installer.installPlugin('@test/plugin', {
        scope: 'local',
        force: true,
      });

      expect(result.skipped).toBeUndefined();
      expect(mockManifestResolver.fetchPluginManifest).toHaveBeenCalled();
    });

    it('should verify checksums', async () => {
      mockResolver.resolvePlugin.mockResolvedValue({
        name: '@test/plugin',
        version: '1.0.0',
        url: 'https://example.com/plugin.json',
        source: 'remote',
      });

      mockManifestResolver.fetchPluginManifest.mockResolvedValue(testPluginManifest);

      // Return correct content for checksum verification
      mockManifestResolver.fetchFile
        .mockResolvedValueOnce('agent content')
        .mockResolvedValueOnce('tool content');

      await expect(
        installer.installPlugin('@test/plugin', { scope: 'local' })
      ).resolves.not.toThrow();
    });

    it('should throw on checksum mismatch', async () => {
      mockResolver.resolvePlugin.mockResolvedValue({
        name: '@test/plugin',
        version: '1.0.0',
        url: 'https://example.com/plugin.json',
        source: 'remote',
      });

      mockManifestResolver.fetchPluginManifest.mockResolvedValue(testPluginManifest);

      // Return wrong content (will cause checksum mismatch)
      mockManifestResolver.fetchFile.mockResolvedValue('wrong content');

      await expect(
        installer.installPlugin('@test/plugin', { scope: 'local' })
      ).rejects.toThrow('Checksum verification failed');
    });
  });

  describe('uninstallPlugin', () => {
    it('should remove plugin from local scope', async () => {
      // Install plugin first
      vol.mkdirSync('/project/.fractary/agents/@test/plugin', { recursive: true });
      vol.writeFileSync(
        '/project/.fractary/agents/@test/plugin/plugin.json',
        JSON.stringify(testPluginManifest)
      );
      vol.writeFileSync(
        '/project/.fractary/agents/@test/plugin/test-agent.yaml',
        'agent content'
      );

      const result = await installer.uninstallPlugin('@test/plugin', {
        scope: 'local',
      });

      expect(result.success).toBe(true);
      expect(vol.existsSync('/project/.fractary/agents/@test/plugin')).toBe(false);
    });

    it('should remove plugin from global scope', async () => {
      // Install plugin first
      vol.mkdirSync('/home/user/.fractary/registry/agents/@test/plugin', { recursive: true });
      vol.writeFileSync(
        '/home/user/.fractary/registry/agents/@test/plugin/plugin.json',
        JSON.stringify(testPluginManifest)
      );

      const result = await installer.uninstallPlugin('@test/plugin', {
        scope: 'global',
      });

      expect(result.success).toBe(true);
      expect(vol.existsSync('/home/user/.fractary/registry/agents/@test/plugin')).toBe(false);
    });

    it('should return false if plugin not installed', async () => {
      const result = await installer.uninstallPlugin('@test/non-existent', {
        scope: 'local',
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('not installed');
    });
  });
});
