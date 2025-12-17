/**
 * Ownership and merge-related types
 */

/**
 * Ownership rule for file management
 * - copy: Always overwrite (managed files)
 * - copy-if-absent: Create only if missing (user customizable)
 * - merge: Intelligent merge (configuration files)
 * - ignore: Never touch (user-specific files)
 */
export type OwnershipRule = 'copy' | 'copy-if-absent' | 'merge' | 'ignore';

/**
 * Result of a file merge operation
 */
export interface MergeResult {
  path: string;
  action: 'created' | 'updated' | 'skipped' | 'merged';
  conflicts?: string[];
}
