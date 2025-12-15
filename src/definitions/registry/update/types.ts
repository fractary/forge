/**
 * Update management types
 */

export interface UpdateCheckResult {
  hasUpdates: boolean;
  updates: UpdateInfo[];
  breakingChanges: UpdateInfo[];
  total: number;
}

export interface UpdateInfo {
  name: string;
  type: 'agent' | 'tool';
  currentVersion: string;
  latestVersion: string;
  isBreaking: boolean;
  changelog?: string;
  deprecationWarning?: string;
}

export interface UpdateOptions {
  /**
   * Update strategy
   * - 'latest': Update to latest stable version
   * - 'patch': Update to latest patch version (e.g., 1.0.x)
   * - 'minor': Update to latest minor version (e.g., 1.x.x)
   */
  strategy?: 'latest' | 'patch' | 'minor';

  /**
   * Include pre-release versions
   */
  includePrerelease?: boolean;

  /**
   * Skip breaking changes
   */
  skipBreaking?: boolean;

  /**
   * Specific packages to update
   */
  packages?: string[];

  /**
   * Dry run - check what would be updated without applying
   */
  dryRun?: boolean;
}

export interface UpdateResult {
  success: boolean;
  updated: UpdatedPackage[];
  failed: FailedUpdate[];
  skipped: SkippedUpdate[];
}

export interface UpdatedPackage {
  name: string;
  type: 'agent' | 'tool';
  from: string;
  to: string;
  changes: string[];
}

export interface FailedUpdate {
  name: string;
  type: 'agent' | 'tool';
  version: string;
  error: string;
}

export interface SkippedUpdate {
  name: string;
  type: 'agent' | 'tool';
  currentVersion: string;
  availableVersion: string;
  reason: 'breaking' | 'manual' | 'constraint';
}
