/**
 * Tests for registry manifest schemas
 */

import {
  RegistryManifestSchema,
  PluginManifestSchema,
  validateRegistryManifest,
  validatePluginManifest,
} from '../../schemas/manifest.js';

describe('RegistryManifestSchema', () => {
  it('should validate a valid registry manifest', () => {
    const manifest = {
      $schema: 'https://fractary.com/schemas/registry-manifest.json',
      name: 'fractary-core',
      version: '1.0.0',
      description: 'Fractary core registry',
      updated: '2025-12-15T12:00:00Z',
      plugins: [
        {
          name: '@fractary/faber-plugin',
          version: '1.0.0',
          description: 'FABER workflow plugin',
          url: 'https://example.com/plugin.json',
          checksum: 'sha256:abc123',
        },
      ],
    };

    const result = RegistryManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('should reject manifest with invalid version format', () => {
    const manifest = {
      name: 'test-registry',
      version: 'invalid',
      description: 'Test',
      updated: '2025-12-15T12:00:00Z',
      plugins: [],
    };

    const result = RegistryManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should reject manifest with invalid datetime', () => {
    const manifest = {
      name: 'test-registry',
      version: '1.0.0',
      description: 'Test',
      updated: 'not-a-datetime',
      plugins: [],
    };

    const result = RegistryManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should reject manifest with invalid plugin name format', () => {
    const manifest = {
      name: 'test-registry',
      version: '1.0.0',
      description: 'Test',
      updated: '2025-12-15T12:00:00Z',
      plugins: [
        {
          name: 'invalid-name', // Should be @org/name
          version: '1.0.0',
          description: 'Test plugin',
          url: 'https://example.com/plugin.json',
          checksum: 'sha256:abc123',
        },
      ],
    };

    const result = RegistryManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should reject manifest with invalid checksum format', () => {
    const manifest = {
      name: 'test-registry',
      version: '1.0.0',
      description: 'Test',
      updated: '2025-12-15T12:00:00Z',
      plugins: [
        {
          name: '@fractary/test',
          version: '1.0.0',
          description: 'Test plugin',
          url: 'https://example.com/plugin.json',
          checksum: 'invalid', // Should be sha256:...
        },
      ],
    };

    const result = RegistryManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should validate using helper function', () => {
    const manifest = {
      name: 'test-registry',
      version: '1.0.0',
      description: 'Test',
      updated: '2025-12-15T12:00:00Z',
      plugins: [],
    };

    expect(() => validateRegistryManifest(manifest)).not.toThrow();
  });

  it('should throw on invalid manifest using helper function', () => {
    const manifest = {
      name: 'test-registry',
      version: 'invalid',
      description: 'Test',
      updated: '2025-12-15T12:00:00Z',
      plugins: [],
    };

    expect(() => validateRegistryManifest(manifest)).toThrow();
  });
});

describe('PluginManifestSchema', () => {
  it('should validate a complete plugin manifest', () => {
    const manifest = {
      name: '@fractary/test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      agents: [
        {
          name: 'test-agent',
          version: '1.0.0',
          description: 'Test agent',
          url: 'https://example.com/agent.yaml',
          checksum: 'sha256:abc123',
        },
      ],
      tools: [
        {
          name: 'test-tool',
          version: '1.0.0',
          description: 'Test tool',
          url: 'https://example.com/tool.yaml',
          checksum: 'sha256:def456',
        },
      ],
      workflows: [
        {
          name: 'test-workflow',
          version: '1.0.0',
          description: 'Test workflow',
          url: 'https://example.com/workflow.yaml',
          checksum: 'sha256:ghi789',
          phases: ['frame', 'architect', 'build', 'evaluate', 'release'],
        },
      ],
      templates: [
        {
          name: 'test-template',
          version: '1.0.0',
          description: 'Test template',
          url: 'https://example.com/template.tar.gz',
          checksum: 'sha256:jkl012',
          type: 'project',
        },
      ],
      hooks: [
        {
          name: 'test-hook',
          version: '1.0.0',
          description: 'Test hook',
          url: 'https://example.com/hook.yaml',
          checksum: 'sha256:mno345',
          event: 'pre-commit',
        },
      ],
      commands: [
        {
          name: 'test-command',
          version: '1.0.0',
          description: 'Test command',
          url: 'https://example.com/command.md',
          checksum: 'sha256:pqr678',
        },
      ],
      config: {
        author: 'Test Author',
        homepage: 'https://example.com',
        repository: 'https://github.com/test/plugin',
        license: 'MIT',
        tags: ['test', 'example'],
      },
    };

    const result = PluginManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('should validate minimal plugin manifest', () => {
    const manifest = {
      name: '@fractary/minimal',
      version: '1.0.0',
      description: 'Minimal plugin',
      config: {
        author: 'Test',
        repository: 'https://github.com/test/minimal',
        license: 'MIT',
      },
    };

    const result = PluginManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('should reject invalid workflow phases', () => {
    const manifest = {
      name: '@fractary/test',
      version: '1.0.0',
      description: 'Test',
      workflows: [
        {
          name: 'bad-workflow',
          version: '1.0.0',
          description: 'Bad workflow',
          url: 'https://example.com/workflow.yaml',
          checksum: 'sha256:abc123',
          phases: ['invalid-phase'], // Not a valid FABER phase
        },
      ],
      config: {
        author: 'Test',
        repository: 'https://github.com/test/test',
        license: 'MIT',
      },
    };

    const result = PluginManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should reject invalid template type', () => {
    const manifest = {
      name: '@fractary/test',
      version: '1.0.0',
      description: 'Test',
      templates: [
        {
          name: 'bad-template',
          version: '1.0.0',
          description: 'Bad template',
          url: 'https://example.com/template.tar.gz',
          checksum: 'sha256:abc123',
          type: 'invalid', // Should be 'project', 'agent', etc.
        },
      ],
      config: {
        author: 'Test',
        repository: 'https://github.com/test/test',
        license: 'MIT',
      },
    };

    const result = PluginManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should validate using helper function', () => {
    const manifest = {
      name: '@fractary/test',
      version: '1.0.0',
      description: 'Test',
      config: {
        author: 'Test',
        repository: 'https://github.com/test/test',
        license: 'MIT',
      },
    };

    expect(() => validatePluginManifest(manifest)).not.toThrow();
  });

  it('should throw on invalid plugin manifest', () => {
    const manifest = {
      name: 'invalid-name', // Should be @org/name
      version: '1.0.0',
      description: 'Test',
      config: {
        author: 'Test',
        repository: 'https://github.com/test/test',
        license: 'MIT',
      },
    };

    expect(() => validatePluginManifest(manifest)).toThrow();
  });
});
