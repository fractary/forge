/**
 * Asset-related types for bundles and starters
 */

import type { OwnershipRule } from './ownership';

/**
 * Bundle manifest structure
 */
export interface BundleManifest {
  $schema?: string;
  id: string;
  version: string;
  name: string;
  description?: string;
  author?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: string;
  repository?: {
    type?: string;
    url?: string;
  };
  engines?: {
    forge?: string;
    node?: string;
  };
  ownership?: Record<string, OwnershipRule>;
  dependencies?: {
    bundles?: string[];
    npm?: Record<string, string>;
  };
  scripts?: Record<string, string>;
  tags?: string[];
  keywords?: string[];
  homepage?: string;
  // File distribution patterns (mutually exclusive with exclude)
  files?: string[]; // Explicit inclusion patterns (glob)
  exclude?: string[]; // Explicit exclusion patterns (glob)
}

/**
 * Starter manifest structure
 */
export interface StarterManifest {
  $schema?: string;
  id: string;
  version: string;
  name: string;
  description?: string;
  author?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: string;
  repository?: {
    type?: string;
    url?: string;
  };
  engines?: {
    forge?: string;
    node?: string;
  };
  framework?: string;
  language?: string;
  styling?: string;
  features?: string[];
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  configuration?: {
    prompts?: Array<{
      name: string;
      message: string;
      default?: string;
    }>;
    replacements?: Record<string, string>;
  };
  recommendedBundles?: string[];
  tags?: string[];
  keywords?: string[];
  homepage?: string;
  demo?: string;
  // File distribution patterns (mutually exclusive with exclude)
  files?: string[]; // Explicit inclusion patterns (glob)
  exclude?: string[]; // Explicit exclusion patterns (glob)
}

/**
 * Bundle reference in project manifest
 */
export interface Bundle {
  name: string;
  version: string;
  source?: string; // Which resolver was used
  ownership?: Record<string, OwnershipRule>;
}

/**
 * Starter reference in project manifest
 */
export interface Starter {
  name: string;
  version: string;
  description?: string;
}

/**
 * Project manifest structure
 */
export interface ProjectManifest {
  name: string;
  version: string;
  starter?: string;
  bundles?: Bundle[];
  environment?: 'test' | 'prod';
  lastUpdated?: string;
  checksums?: Record<string, string>;
}
