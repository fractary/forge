/**
 * Registry Type Exports
 *
 * Central export point for all registry-related types and schemas.
 */

// Export manifest schemas and types
export {
  // Schemas
  RegistryPluginReferenceSchema,
  RegistryManifestSchema,
  PluginItemSchema,
  PluginHookSchema,
  PluginCommandSchema,
  PluginWorkflowSchema,
  PluginTemplateSchema,
  PluginConfigSchema,
  PluginManifestSchema,

  // Types
  type RegistryPluginReference,
  type RegistryManifest,
  type PluginItem,
  type PluginHook,
  type PluginCommand,
  type PluginWorkflow,
  type PluginTemplate,
  type PluginConfig,
  type PluginManifest,

  // Validation helpers
  validateRegistryManifest,
  validatePluginManifest,
  safeValidateRegistryManifest,
  safeValidatePluginManifest,
} from './schemas/manifest.js';

// Export config schemas and types
export {
  // Schemas
  RegistryAuthSchema,
  RegistryConfigSchema,
  InstallConfigSchema,
  ForgeConfigSchema,

  // Types
  type RegistryAuth,
  type RegistryConfig,
  type InstallConfig,
  type ForgeConfig,

  // Defaults
  DEFAULT_INSTALL_CONFIG,
  DEFAULT_FRACTARY_REGISTRY,
  DEFAULT_FORGE_CONFIG,

  // Validation helpers
  validateForgeConfig,
  validateRegistryConfig,
  safeValidateForgeConfig,
  safeValidateRegistryConfig,

  // Utility functions
  mergeWithDefaults,
  validateUniquePriorities,
  sortByPriority,
  getEnabledRegistries,
} from './schemas/config.js';
