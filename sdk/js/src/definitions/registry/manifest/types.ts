/**
 * Manifest types for package metadata management
 */

export interface PackageManifest {
  name: string;
  type: 'agent' | 'tool';
  description: string;

  // Available versions
  versions: ManifestVersion[];

  // Latest stable version
  latest: string;

  // Dependencies
  dependencies?: {
    agents?: Record<string, string>; // name -> version constraint
    tools?: Record<string, string>;
  };

  // Stockyard metadata
  stockyard?: {
    author: string;
    license: string;
    homepage: string;
    repository: string;
    downloads: number;
    rating: number;
    tags: string[];
  };

  // Fork tracking
  fork_of?: string | null;
  forks?: ForkInfo[];

  // Local installation metadata
  installed_versions: string[];
  active_version?: string; // Version used in lockfile
  last_checked: string; // ISO timestamp
  update_available: boolean;
}

export interface ManifestVersion {
  version: string;
  released: string; // ISO timestamp
  status: 'stable' | 'beta' | 'alpha' | 'deprecated';
  changelog_url?: string;
  deprecation_message?: string;
}

export interface ForkInfo {
  name: string;
  author: string;
  url: string;
}

export interface ManifestSyncOptions {
  force?: boolean; // Force sync even if recently checked
  agents?: string[]; // Specific agents to sync (default: all)
  tools?: string[]; // Specific tools to sync (default: all)
}
