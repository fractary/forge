/**
 * Forge Configuration Schemas
 *
 * Defines Zod schemas for validating Forge configuration files
 * following SPEC-FORGE-005 section 4.
 */

import { z } from 'zod';

// ============================================================================
// Registry Configuration
// ============================================================================

/**
 * Authentication configuration for registry access
 */
export const RegistryAuthSchema = z.object({
  type: z.enum(['bearer', 'apikey'], {
    errorMap: () => ({ message: 'Auth type must be bearer or apikey' }),
  }),
  token_env: z.string().min(1, 'Token environment variable name is required'),
});

export type RegistryAuth = z.infer<typeof RegistryAuthSchema>;

/**
 * Individual registry configuration
 */
export const RegistryConfigSchema = z.object({
  name: z.string().min(1, 'Registry name is required'),
  type: z.enum(['manifest', 'stockyard'], {
    errorMap: () => ({ message: 'Registry type must be manifest or stockyard' }),
  }),
  url: z.string().url('Registry URL must be valid HTTPS URL'),
  enabled: z.boolean(),
  priority: z.number().min(1, 'Priority must be >= 1'),
  cache_ttl: z.number().min(0, 'Cache TTL must be non-negative').optional(),
  auth: RegistryAuthSchema.optional(),
});

export type RegistryConfig = z.infer<typeof RegistryConfigSchema>;

/**
 * Installation settings
 */
export const InstallConfigSchema = z.object({
  default_scope: z.enum(['global', 'local'], {
    errorMap: () => ({ message: 'Default scope must be global or local' }),
  }),
  verify_checksums: z.boolean(),
  auto_install_dependencies: z.boolean(),
});

export type InstallConfig = z.infer<typeof InstallConfigSchema>;

/**
 * Complete Forge configuration
 * File location: .fractary/config.json or ~/.fractary/config.json
 */
export const ForgeConfigSchema = z.object({
  registries: z.array(RegistryConfigSchema),
  install: InstallConfigSchema.optional(),
});

export type ForgeConfig = z.infer<typeof ForgeConfigSchema>;

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default installation configuration
 */
export const DEFAULT_INSTALL_CONFIG: InstallConfig = {
  default_scope: 'global',
  verify_checksums: true,
  auto_install_dependencies: true,
};

/**
 * Default Fractary registry configuration
 */
export const DEFAULT_FRACTARY_REGISTRY: RegistryConfig = {
  name: 'fractary-core',
  type: 'manifest',
  url: 'https://raw.githubusercontent.com/fractary/plugins/main/registry.json',
  enabled: true,
  priority: 1,
  cache_ttl: 3600, // 1 hour
};

/**
 * Default Forge configuration with Fractary registry
 */
export const DEFAULT_FORGE_CONFIG: ForgeConfig = {
  registries: [DEFAULT_FRACTARY_REGISTRY],
  install: DEFAULT_INSTALL_CONFIG,
};

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate and parse Forge configuration
 * @throws ZodError if validation fails
 */
export function validateForgeConfig(data: unknown): ForgeConfig {
  return ForgeConfigSchema.parse(data);
}

/**
 * Validate and parse registry configuration
 * @throws ZodError if validation fails
 */
export function validateRegistryConfig(data: unknown): RegistryConfig {
  return RegistryConfigSchema.parse(data);
}

/**
 * Safe validation - returns result object instead of throwing
 */
export function safeValidateForgeConfig(data: unknown) {
  return ForgeConfigSchema.safeParse(data);
}

/**
 * Safe validation - returns result object instead of throwing
 */
export function safeValidateRegistryConfig(data: unknown) {
  return RegistryConfigSchema.safeParse(data);
}

/**
 * Merge user config with defaults
 * User config takes precedence, missing values filled from defaults
 */
export function mergeWithDefaults(userConfig: Partial<ForgeConfig>): ForgeConfig {
  return {
    registries: userConfig.registries || DEFAULT_FORGE_CONFIG.registries,
    install: userConfig.install
      ? { ...DEFAULT_INSTALL_CONFIG, ...userConfig.install }
      : DEFAULT_INSTALL_CONFIG,
  };
}

/**
 * Validate that registry priorities are unique
 * Returns array of duplicate priorities if found
 */
export function validateUniquePriorities(config: ForgeConfig): number[] {
  const priorities = config.registries.map((r) => r.priority);
  const duplicates = priorities.filter((p, index) => priorities.indexOf(p) !== index);
  return [...new Set(duplicates)];
}

/**
 * Sort registries by priority (lower number = higher priority)
 */
export function sortByPriority(registries: RegistryConfig[]): RegistryConfig[] {
  return [...registries].sort((a, b) => a.priority - b.priority);
}

/**
 * Get enabled registries sorted by priority
 */
export function getEnabledRegistries(config: ForgeConfig): RegistryConfig[] {
  return sortByPriority(config.registries.filter((r) => r.enabled));
}
