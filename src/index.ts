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
