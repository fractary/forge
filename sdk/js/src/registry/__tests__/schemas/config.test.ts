/**
 * Tests for registry configuration schemas
 */

import {
  RegistryConfigSchema,
  ForgeConfigSchema,
  DEFAULT_FRACTARY_REGISTRY,
  validateRegistryConfig,
  validateForgeConfig,
} from '../../schemas/config.js';

describe('RegistryConfigSchema', () => {
  it('should validate a valid registry config', () => {
    const config = {
      name: 'test-registry',
      type: 'manifest' as const,
      url: 'https://example.com/registry.json',
      enabled: true,
      priority: 1,
      cache_ttl: 3600,
    };

    const result = RegistryConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should apply defaults for optional fields', () => {
    const config = {
      name: 'test-registry',
      type: 'manifest' as const,
      url: 'https://example.com/registry.json',
    };

    const result = RegistryConfigSchema.parse(config);
    expect(result.enabled).toBe(true);
    expect(result.priority).toBe(10);
    expect(result.cache_ttl).toBe(3600);
  });

  it('should reject invalid URL', () => {
    const config = {
      name: 'test-registry',
      type: 'manifest' as const,
      url: 'not-a-url',
      enabled: true,
      priority: 1,
    };

    const result = RegistryConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject negative priority', () => {
    const config = {
      name: 'test-registry',
      type: 'manifest' as const,
      url: 'https://example.com/registry.json',
      priority: -1,
    };

    const result = RegistryConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject negative cache_ttl', () => {
    const config = {
      name: 'test-registry',
      type: 'manifest' as const,
      url: 'https://example.com/registry.json',
      cache_ttl: -100,
    };

    const result = RegistryConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should validate using helper function', () => {
    const config = {
      name: 'test-registry',
      type: 'manifest' as const,
      url: 'https://example.com/registry.json',
    };

    expect(() => validateRegistryConfig(config)).not.toThrow();
  });
});

describe('ForgeConfigSchema', () => {
  it('should validate a valid forge config', () => {
    const config = {
      registries: [
        {
          name: 'fractary-core',
          type: 'manifest' as const,
          url: 'https://example.com/registry.json',
          enabled: true,
          priority: 1,
        },
      ],
      install: {
        verify_checksums: true,
        default_scope: 'local' as const,
      },
    };

    const result = ForgeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate config with empty registries', () => {
    const config = {
      registries: [],
    };

    const result = ForgeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate config without install options', () => {
    const config = {
      registries: [DEFAULT_FRACTARY_REGISTRY],
    };

    const result = ForgeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should apply defaults for install options', () => {
    const config = {
      registries: [],
      install: {},
    };

    const result = ForgeConfigSchema.parse(config);
    expect(result.install?.verify_checksums).toBe(true);
    expect(result.install?.default_scope).toBe('local');
  });

  it('should reject invalid install scope', () => {
    const config = {
      registries: [],
      install: {
        default_scope: 'invalid' as any,
      },
    };

    const result = ForgeConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should validate using helper function', () => {
    const config = {
      registries: [DEFAULT_FRACTARY_REGISTRY],
    };

    expect(() => validateForgeConfig(config)).not.toThrow();
  });
});

describe('DEFAULT_FRACTARY_REGISTRY', () => {
  it('should be a valid registry config', () => {
    const result = RegistryConfigSchema.safeParse(DEFAULT_FRACTARY_REGISTRY);
    expect(result.success).toBe(true);
  });

  it('should have expected values', () => {
    expect(DEFAULT_FRACTARY_REGISTRY.name).toBe('fractary-core');
    expect(DEFAULT_FRACTARY_REGISTRY.type).toBe('manifest');
    expect(DEFAULT_FRACTARY_REGISTRY.enabled).toBe(true);
    expect(DEFAULT_FRACTARY_REGISTRY.priority).toBe(1);
    expect(DEFAULT_FRACTARY_REGISTRY.url).toContain('fractary/plugins');
  });
});
