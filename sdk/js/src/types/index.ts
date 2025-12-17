/**
 * Type definitions for @fractary/forge SDK
 */

// Asset types
export type { BundleManifest, StarterManifest, Bundle, Starter, ProjectManifest } from './assets';

// Ownership types
export type { OwnershipRule, MergeResult } from './ownership';

// Validation types
export type { ValidationError, ValidationWarning, ValidationResult } from './validation';

// Resolver types
export type { AssetIdentifier, AssetLocation, AssetPackage, ResolverOptions } from './resolvers';

// Configuration types
export type {
  GitHubResolverConfig,
  GitLabResolverConfig,
  CatalogSource,
  CatalogResolverConfig,
  CacheConfig,
  ForgeConfig,
  ProjectConfig,
} from './config';

// Cache types
export type { CacheEntry, CacheStats, CacheOptions } from './cache';
