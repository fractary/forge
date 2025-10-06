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
  ResolverOptions,
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
