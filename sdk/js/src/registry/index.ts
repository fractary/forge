/**
 * Forge Registry Module
 *
 * Public API for the Forge registry system.
 * This module provides programmatic access to plugin installation,
 * component resolution, and registry management.
 *
 * Designed to be consumed by the fractary/cli project.
 */

// ============================================================================
// Core Components
// ============================================================================

export { Resolver, type ResolvedComponent, type ResolveOptions } from './resolver.js';
export { Installer, type InstallOptions, type InstallResult } from './installer.js';
export { ConfigManager, type ConfigLoadResult } from './config-manager.js';
export { ManifestCacheManager, type ManifestCache, type CacheStats } from './cache.js';

// ============================================================================
// Resolvers
// ============================================================================

export {
  LocalResolver,
  type LocalComponent,
  type ComponentType,
  getProjectFractaryDir,
  getGlobalFractaryDir,
} from './resolvers/local-resolver.js';

export {
  ManifestResolver,
  type FetchOptions,
  type ManifestFetchResult,
} from './resolvers/manifest-resolver.js';

// ============================================================================
// Types & Schemas
// ============================================================================

export {
  // Registry Manifest
  type RegistryManifest,
  type RegistryPluginReference,
  RegistryManifestSchema,
  RegistryPluginReferenceSchema,
  validateRegistryManifest,
  safeValidateRegistryManifest,

  // Plugin Manifest
  type PluginManifest,
  type PluginItem,
  type PluginHook,
  type PluginCommand,
  type PluginWorkflow,
  type PluginTemplate,
  type PluginConfig,
  PluginManifestSchema,
  PluginItemSchema,
  PluginHookSchema,
  PluginCommandSchema,
  PluginWorkflowSchema,
  PluginTemplateSchema,
  PluginConfigSchema,
  validatePluginManifest,
  safeValidatePluginManifest,

  // Configuration
  type ForgeConfig,
  type RegistryConfig,
  type RegistryAuth,
  type InstallConfig,
  ForgeConfigSchema,
  RegistryConfigSchema,
  RegistryAuthSchema,
  InstallConfigSchema,
  validateForgeConfig,
  safeValidateForgeConfig,
  validateRegistryConfig,
  safeValidateRegistryConfig,

  // Defaults
  DEFAULT_FORGE_CONFIG,
  DEFAULT_FRACTARY_REGISTRY,
  DEFAULT_INSTALL_CONFIG,

  // Utilities
  mergeWithDefaults,
  validateUniquePriorities,
  sortByPriority,
  getEnabledRegistries,
} from './types.js';

// ============================================================================
// Path Utilities
// ============================================================================

export { getProjectConfigPath, getGlobalConfigPath } from './config-manager.js';

// ============================================================================
// Singleton Instances
// ============================================================================

/**
 * Default resolver instance
 * Use this for most common resolution tasks
 */
export { resolver } from './resolver.js';

/**
 * Default installer instance
 * Use this for most installation tasks
 */
export { installer } from './installer.js';

/**
 * Default config manager instance
 * Use this for configuration management
 */
export { configManager } from './config-manager.js';

/**
 * Default manifest cache instance
 * Use this for cache operations
 */
export { manifestCache } from './cache.js';

/**
 * Default local resolver instance
 * Use this for local file system operations
 */
export { localResolver } from './resolvers/local-resolver.js';

/**
 * Default manifest resolver instance
 * Use this for remote manifest operations
 */
export { manifestResolver } from './resolvers/manifest-resolver.js';
