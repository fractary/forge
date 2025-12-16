/**
 * Resolver-related types and interfaces
 */

import type { BundleManifest, StarterManifest } from './assets';

/**
 * Asset identifier components
 */
export interface AssetIdentifier {
  protocol?: string; // 'github', 'gitlab', 'catalog', 'file', etc.
  owner?: string;
  repo?: string;
  id?: string; // For catalog-based identifiers
  ref?: string; // tag, branch, or commit
  type?: 'bundle' | 'starter';
}

/**
 * Resolved asset location
 */
export interface AssetLocation {
  protocol: string;
  owner?: string;
  repo?: string;
  ref?: string;
  path?: string;
  url?: string; // For direct URLs
}

/**
 * Asset package with manifest and files
 */
export interface AssetPackage {
  manifest: BundleManifest | StarterManifest;
  files: Map<string, Buffer>;
  metadata: {
    version: string;
    commit?: string;
    timestamp: Date;
    source: string; // e.g., "github:owner/repo"
    resolver: string; // Which resolver was used
  };
}

/**
 * Resolver options for initialization
 */
export interface ResolverOptions {
  token?: string;
  defaultOrg?: string;
  cacheDir?: string;
  cacheTTL?: number;
}
