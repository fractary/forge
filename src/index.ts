/**
 * @fractary/forge
 * Core SDK for Forge asset management with multi-resolver architecture
 */

// Version
export const VERSION = '1.0.0';

// Type exports
export type {
  // Assets
  BundleManifest,
  StarterManifest,
  Bundle,
  Starter,
  ProjectManifest,
  // Ownership
  OwnershipRule,
  MergeResult,
  // Validation
  ValidationError,
  ValidationWarning,
  ValidationResult,
  // Resolvers
  AssetIdentifier,
  AssetLocation,
  AssetPackage,
  ResolverOptions as AssetResolverOptions,
  // Configuration
  GitHubResolverConfig,
  GitLabResolverConfig,
  CatalogSource,
  CatalogResolverConfig,
  CacheConfig,
  ForgeConfig,
  ProjectConfig,
  // Cache
  CacheEntry,
  CacheStats,
  CacheOptions,
} from './types';

// Resolver exports
export {
  ResolverManager,
  createResolverManager,
  GitHubResolver,
  CatalogResolver,
  LocalResolver,
} from './resolvers';

export type {
  ResolverOptions,
  IResolver,
  GitHubResolverOptions,
  Catalog,
  CatalogEntry,
  LocalResolverOptions,
} from './resolvers';

// Configuration exports
export { ConfigManager, configManager, loadConfig, getDefaultGlobalConfig } from './config';

// Cache exports
export { CacheManager } from './cache';

// Error exports
export { ErrorCode, ForgeError, getUserFriendlyMessage, isForgeError, assertDefined } from './errors';

// Logger exports
export { Logger, logger } from './logger';
export type { LogLevel } from './logger';

// File system utilities exports
export * as fs from './fs';

// Definition system exports
export {
  AgentAPI,
  ToolAPI,
  DefinitionResolver,
  AgentFactory,
  ToolExecutor,
  YAMLLoader,
  DefinitionValidator,
  PromptCacheManager,
  DefinitionErrorCode,
} from './definitions';

export type {
  AgentDefinition,
  ToolDefinition,
  LLMConfig,
  LLMProvider,
  CachingConfig,
  CachingSource,
  ExecutableAgent,
  ExecutableAgentInterface,
  AgentResult,
  AgentInfo,
  ToolResult,
  ToolInfo,
  HealthCheckResult,
  ResolvedAgent,
  ResolvedTool,
  RegistryConfig as DefinitionRegistryConfig, // Renamed to avoid conflict
} from './definitions';

// ============================================================================
// Registry Module - Plugin installation and manifest-based registries
// ============================================================================

/**
 * Registry module for plugin installation and management
 *
 * This module provides the core infrastructure for:
 * - Installing plugins from manifest-based registries
 * - Resolving components (agents, tools, workflows, templates)
 * - Managing registry configurations
 * - Caching registry manifests
 *
 * Used by the fractary/cli project to implement `fractary forge` commands.
 */
export * as Registry from './registry/index.js';

// Also export commonly used registry types at the top level for convenience
export type {
  RegistryManifest,
  PluginManifest,
  RegistryConfig,
  ForgeConfig as RegistryForgeConfig,
  InstallOptions,
  InstallResult,
  ResolvedComponent,
  ComponentType,
} from './registry/index.js';

// ============================================================================
// Exporters Module - Convert Fractary YAML to various formats
// ============================================================================

/**
 * Exporters module for converting Fractary YAML to framework-specific formats
 *
 * This module provides converters for:
 * - LangChain (Python code with LangChain/LangGraph)
 * - Claude Code (Markdown files for .claude/ directory)
 * - n8n (JSON workflow definitions)
 *
 * Used by the fractary/cli project to implement `fractary forge export` commands.
 */
export * as Exporters from './exporters/index.js';

// Also export commonly used exporter types at the top level for convenience
export type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  ExportedFile,
  LangChainExportOptions,
  ClaudeExportOptions,
  N8nExportOptions,
} from './exporters/index.js';
