/**
 * Configuration-related types
 */

import type { OwnershipRule } from './ownership';

/**
 * GitHub resolver configuration
 */
export interface GitHubResolverConfig {
  token?: string;
  defaultOrg?: string;
  enterprise?: string; // GitHub Enterprise URL
  cacheDir?: string;
  cacheTTL?: number;
  tokens?: Record<string, string>; // Per-org tokens
}

/**
 * GitLab resolver configuration
 */
export interface GitLabResolverConfig {
  token?: string;
  defaultGroup?: string;
  baseUrl?: string;
  cacheDir?: string;
  cacheTTL?: number;
}

/**
 * Catalog source configuration
 */
export interface CatalogSource {
  url: string;
  name?: string;
  token?: string;
  priority?: number;
}

/**
 * Catalog resolver configuration
 */
export interface CatalogResolverConfig {
  sources: CatalogSource[];
  cacheDir?: string;
  cacheTTL?: number;
}

/**
 * Unified cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Default TTL in milliseconds
  dir: string; // Base cache directory
  maxSize?: number; // Max cache size in MB
}

/**
 * Global Forge configuration
 */
export interface ForgeConfig {
  // Resolver configuration
  resolvers: {
    // Which resolver to use for unprefixed identifiers
    default?: 'github' | 'gitlab' | 'catalog' | string;

    // GitHub configuration
    github?: GitHubResolverConfig;

    // GitLab configuration (future)
    gitlab?: GitLabResolverConfig;

    // Catalog configuration
    catalog?: CatalogResolverConfig;
  };

  // Unified cache configuration
  cache?: CacheConfig;

  // Default values
  defaults?: {
    organization?: string;
    starter?: string;
    bundle?: string;
  };

  // Feature flags
  features?: {
    telemetry?: boolean;
    updateCheck?: boolean;
  };

  // Local paths
  paths?: {
    cache?: string;
    templates?: string;
  };

  // Definition system configuration
  definitions?: {
    registry?: {
      local?: {
        enabled: boolean;
        paths: string[];
      };
      global?: {
        enabled: boolean;
        path: string;
      };
      stockyard?: {
        enabled: boolean;
        url?: string;
        apiKey?: string;
      };
    };
    caching?: {
      enabled: boolean;
      defaultTtl: number; // Default TTL in seconds
      sourceTtls?: {
        // Per-source TTL overrides
        file?: number;
        glob?: number;
        codex?: number;
        inline?: number;
      };
    };
    validation?: {
      strict: boolean;
      warnOnMissingTools: boolean;
    };
    execution?: {
      defaultTimeout: number; // Default tool execution timeout in ms
    };
  };
}

/**
 * Project-level configuration
 */
export interface ProjectConfig {
  name: string;
  version: string;
  starter?: string;
  bundles?: Array<{
    name: string;
    version: string;
    source?: string; // Which resolver was used
    ownership?: Record<string, OwnershipRule>;
  }>;
  lastUpdated?: string;
}
