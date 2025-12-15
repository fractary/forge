/**
 * Tests for config manager
 */

import { vol } from 'memfs';
import { ConfigManager } from '../config-manager.js';
import { DEFAULT_FRACTARY_REGISTRY } from '../schemas/config.js';
import type { RegistryConfig } from '../types.js';

// Mock fs-extra to use memfs
jest.mock('fs-extra', () => require('memfs'));

// Mock os.homedir()
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: () => '/home/user',
}));

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    vol.reset();
    configManager = new ConfigManager();

    // Setup directory structure
    vol.mkdirpSync('/home/user/.fractary');
    vol.mkdirpSync('/project/.fractary');

    // Mock process.cwd() to return /project
    jest.spyOn(process, 'cwd').mockReturnValue('/project');
  });

  afterEach(() => {
    vol.reset();
    jest.restoreAllMocks();
  });

  describe('loadConfig', () => {
    it('should return default config when no config files exist', async () => {
      const config = await configManager.loadConfig();

      expect(config.registries).toHaveLength(1);
      expect(config.registries[0]).toEqual(DEFAULT_FRACTARY_REGISTRY);
    });

    it('should load project config', async () => {
      const projectConfig = {
        registries: [
          {
            name: 'project-registry',
            type: 'manifest' as const,
            url: 'https://project.com/registry.json',
            enabled: true,
            priority: 1,
          },
        ],
      };

      vol.writeFileSync(
        '/project/.fractary/config.json',
        JSON.stringify(projectConfig)
      );

      const config = await configManager.loadConfig();

      expect(config.registries).toContainEqual(
        expect.objectContaining({ name: 'project-registry' })
      );
    });

    it('should load global config', async () => {
      const globalConfig = {
        registries: [
          {
            name: 'global-registry',
            type: 'manifest' as const,
            url: 'https://global.com/registry.json',
            enabled: true,
            priority: 2,
          },
        ],
      };

      vol.writeFileSync(
        '/home/user/.fractary/config.json',
        JSON.stringify(globalConfig)
      );

      const config = await configManager.loadConfig();

      expect(config.registries).toContainEqual(
        expect.objectContaining({ name: 'global-registry' })
      );
    });

    it('should merge project and global configs with proper priority', async () => {
      const projectConfig = {
        registries: [
          {
            name: 'project-registry',
            type: 'manifest' as const,
            url: 'https://project.com/registry.json',
            enabled: true,
            priority: 1,
          },
        ],
      };

      const globalConfig = {
        registries: [
          {
            name: 'global-registry',
            type: 'manifest' as const,
            url: 'https://global.com/registry.json',
            enabled: true,
            priority: 2,
          },
        ],
      };

      vol.writeFileSync(
        '/project/.fractary/config.json',
        JSON.stringify(projectConfig)
      );
      vol.writeFileSync(
        '/home/user/.fractary/config.json',
        JSON.stringify(globalConfig)
      );

      const config = await configManager.loadConfig();

      expect(config.registries).toHaveLength(3); // project + global + default
      expect(config.registries[0].name).toBe('project-registry');
      expect(config.registries[1].name).toBe('global-registry');
    });

    it('should override duplicate registries with project config', async () => {
      const projectConfig = {
        registries: [
          {
            name: 'test-registry',
            type: 'manifest' as const,
            url: 'https://project.com/registry.json',
            enabled: true,
            priority: 1,
          },
        ],
      };

      const globalConfig = {
        registries: [
          {
            name: 'test-registry',
            type: 'manifest' as const,
            url: 'https://global.com/registry.json',
            enabled: false,
            priority: 2,
          },
        ],
      };

      vol.writeFileSync(
        '/project/.fractary/config.json',
        JSON.stringify(projectConfig)
      );
      vol.writeFileSync(
        '/home/user/.fractary/config.json',
        JSON.stringify(globalConfig)
      );

      const config = await configManager.loadConfig();

      const testRegistry = config.registries.find((r) => r.name === 'test-registry');
      expect(testRegistry?.url).toBe('https://project.com/registry.json');
      expect(testRegistry?.enabled).toBe(true);
    });
  });

  describe('saveProjectConfig', () => {
    it('should save project config', async () => {
      const config = {
        registries: [
          {
            name: 'test-registry',
            type: 'manifest' as const,
            url: 'https://test.com/registry.json',
            enabled: true,
            priority: 1,
          },
        ],
      };

      await configManager.saveProjectConfig(config);

      const saved = JSON.parse(
        vol.readFileSync('/project/.fractary/config.json', 'utf-8') as string
      );

      expect(saved.registries).toHaveLength(1);
      expect(saved.registries[0].name).toBe('test-registry');
    });

    it('should create directory if it does not exist', async () => {
      vol.rmdirSync('/project/.fractary');

      const config = {
        registries: [],
      };

      await configManager.saveProjectConfig(config);

      expect(vol.existsSync('/project/.fractary/config.json')).toBe(true);
    });
  });

  describe('saveGlobalConfig', () => {
    it('should save global config', async () => {
      const config = {
        registries: [
          {
            name: 'test-registry',
            type: 'manifest' as const,
            url: 'https://test.com/registry.json',
            enabled: true,
            priority: 1,
          },
        ],
      };

      await configManager.saveGlobalConfig(config);

      const saved = JSON.parse(
        vol.readFileSync('/home/user/.fractary/config.json', 'utf-8') as string
      );

      expect(saved.registries).toHaveLength(1);
      expect(saved.registries[0].name).toBe('test-registry');
    });
  });

  describe('addRegistry', () => {
    it('should add registry to project config', async () => {
      const registry: RegistryConfig = {
        name: 'new-registry',
        type: 'manifest',
        url: 'https://new.com/registry.json',
        enabled: true,
        priority: 5,
        cache_ttl: 3600,
      };

      await configManager.addRegistry(registry, 'project');

      const config = await configManager.loadConfig();
      expect(config.registries).toContainEqual(expect.objectContaining({ name: 'new-registry' }));
    });

    it('should add registry to global config', async () => {
      const registry: RegistryConfig = {
        name: 'new-registry',
        type: 'manifest',
        url: 'https://new.com/registry.json',
        enabled: true,
        priority: 5,
        cache_ttl: 3600,
      };

      await configManager.addRegistry(registry, 'global');

      const saved = JSON.parse(
        vol.readFileSync('/home/user/.fractary/config.json', 'utf-8') as string
      );

      expect(saved.registries).toContainEqual(expect.objectContaining({ name: 'new-registry' }));
    });

    it('should update existing registry', async () => {
      const registry1: RegistryConfig = {
        name: 'test-registry',
        type: 'manifest',
        url: 'https://test1.com/registry.json',
        enabled: true,
        priority: 5,
        cache_ttl: 3600,
      };

      await configManager.addRegistry(registry1, 'project');

      const registry2: RegistryConfig = {
        name: 'test-registry',
        type: 'manifest',
        url: 'https://test2.com/registry.json',
        enabled: false,
        priority: 10,
        cache_ttl: 1800,
      };

      await configManager.addRegistry(registry2, 'project');

      const config = await configManager.loadConfig();
      const testRegistry = config.registries.find((r) => r.name === 'test-registry');

      expect(testRegistry?.url).toBe('https://test2.com/registry.json');
      expect(testRegistry?.enabled).toBe(false);
      expect(testRegistry?.priority).toBe(10);
    });
  });

  describe('removeRegistry', () => {
    it('should remove registry from project config', async () => {
      const registry: RegistryConfig = {
        name: 'test-registry',
        type: 'manifest',
        url: 'https://test.com/registry.json',
        enabled: true,
        priority: 5,
        cache_ttl: 3600,
      };

      await configManager.addRegistry(registry, 'project');
      await configManager.removeRegistry('test-registry', 'project');

      const config = await configManager.loadConfig();
      expect(config.registries).not.toContainEqual(
        expect.objectContaining({ name: 'test-registry' })
      );
    });

    it('should remove registry from global config', async () => {
      const registry: RegistryConfig = {
        name: 'test-registry',
        type: 'manifest',
        url: 'https://test.com/registry.json',
        enabled: true,
        priority: 5,
        cache_ttl: 3600,
      };

      await configManager.addRegistry(registry, 'global');
      await configManager.removeRegistry('test-registry', 'global');

      const saved = JSON.parse(
        vol.readFileSync('/home/user/.fractary/config.json', 'utf-8') as string
      );

      expect(saved.registries).not.toContainEqual(
        expect.objectContaining({ name: 'test-registry' })
      );
    });

    it('should not fail if registry does not exist', async () => {
      await expect(
        configManager.removeRegistry('non-existent', 'project')
      ).resolves.not.toThrow();
    });
  });

  describe('updateRegistry', () => {
    it('should update registry settings', async () => {
      const registry: RegistryConfig = {
        name: 'test-registry',
        type: 'manifest',
        url: 'https://test.com/registry.json',
        enabled: true,
        priority: 5,
        cache_ttl: 3600,
      };

      await configManager.addRegistry(registry, 'project');

      await configManager.updateRegistry(
        'test-registry',
        { enabled: false, priority: 10 },
        'project'
      );

      const config = await configManager.loadConfig();
      const testRegistry = config.registries.find((r) => r.name === 'test-registry');

      expect(testRegistry?.enabled).toBe(false);
      expect(testRegistry?.priority).toBe(10);
      expect(testRegistry?.url).toBe('https://test.com/registry.json'); // Unchanged
    });

    it('should throw if registry does not exist', async () => {
      await expect(
        configManager.updateRegistry('non-existent', { enabled: false }, 'project')
      ).rejects.toThrow();
    });
  });
});
