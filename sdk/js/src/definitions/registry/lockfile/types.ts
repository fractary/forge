/**
 * Lockfile types for version pinning and integrity checking
 */

import type { AgentDefinition, ToolDefinition } from '../../schemas';

/**
 * Lockfile structure
 */
export interface Lockfile {
  version: number; // Lockfile format version
  generated: string; // ISO timestamp
  agents: Record<string, LockfileEntry>;
  tools: Record<string, LockfileEntry>;
}

/**
 * Individual lockfile entry for an agent or tool
 */
export interface LockfileEntry {
  version: string; // Exact version (not a range)
  resolved: 'local' | 'global' | 'stockyard';
  integrity: string; // SHA-256 hash
  dependencies?: LockfileDependencies;
}

/**
 * Dependencies tracked in lockfile
 */
export interface LockfileDependencies {
  agents?: Record<string, string>; // name -> version
  tools?: Record<string, string>; // name -> version
}

/**
 * Options for generating lockfile
 */
export interface LockfileGenerateOptions {
  force?: boolean; // Regenerate even if lockfile exists
  validate?: boolean; // Validate integrity after generation
}

/**
 * Lockfile validation result
 */
export interface LockfileValidationResult {
  valid: boolean;
  errors: LockfileValidationError[];
  warnings: LockfileValidationWarning[];
}

/**
 * Validation error
 */
export interface LockfileValidationError {
  type: 'missing' | 'integrity_mismatch' | 'version_mismatch';
  name: string;
  expected?: string;
  actual?: string;
}

/**
 * Validation warning
 */
export interface LockfileValidationWarning {
  type: 'outdated' | 'deprecated';
  name: string;
  message: string;
}
