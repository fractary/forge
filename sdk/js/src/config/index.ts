/**
 * Configuration management for Forge SDK
 */

export { ConfigManager, configManager, loadConfig } from './manager';
export { getDefaultGlobalConfig } from './defaults';

// Forge section configuration (unified config)
export {
  // Types
  type ForgeSectionConfig,
  type LocalRegistryConfig,
  type GlobalRegistryConfig,
  type StockyardRegistryConfig,
  type RegistryConfig,
  type LockfileConfig,
  type UpdatePolicy,
  type UpdatesConfig,
  type DefaultAgentModelConfig,
  type DefaultAgentLLMConfig,
  type DefaultAgentConfig,
  type DefaultToolImplementationConfig,
  type DefaultToolConfig,
  type DefaultsConfig,
  type FeaturesConfig,
  type ForgeConfigValidationResult,
  // Constants
  FORGE_CONFIG_SCHEMA_VERSION,
  // Schemas
  ForgeSectionConfigSchema,
  LocalRegistryConfigSchema,
  GlobalRegistryConfigSchema,
  StockyardRegistryConfigSchema,
  RegistryConfigSchema,
  LockfileConfigSchema,
  UpdatePolicySchema,
  UpdatesConfigSchema,
  DefaultAgentConfigSchema,
  DefaultToolConfigSchema,
  DefaultsConfigSchema,
  FeaturesConfigSchema,
  // Functions
  getDefaultForgeConfig,
  validateForgeConfig,
  safeValidateForgeConfig,
  mergeWithDefaults,
} from './forge-section';

// Unified config service
export {
  // Types
  type UnifiedConfig,
  type LoadConfigResult,
  type MigrationResult,
  type ResolveEnvVarsOptions,
  // Functions
  findProjectRoot,
  getUnifiedConfigPath,
  getOldForgeConfigPath,
  unifiedConfigExists,
  forgeConfigExists,
  oldForgeConfigExists,
  loadUnifiedConfig,
  loadForgeSection,
  safeLoadForgeSection,
  saveUnifiedConfig,
  saveForgeSection,
  updateForgeSection,
  migrateOldForgeConfig,
  needsMigration,
  initializeForgeConfig,
  validateForgeConfiguration,
  previewForgeConfig,
  resolveEnvVars,
  resolveEnvVarsInConfig,
} from './unified-config-service';
