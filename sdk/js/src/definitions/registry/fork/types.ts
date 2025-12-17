/**
 * Fork management types
 */

export interface ForkMetadata {
  name: string;
  version: string;
  forked_at: string; // ISO timestamp
  merged_at?: string; // ISO timestamp of last merge
}

export interface ForkOptions {
  sourceName: string;
  targetName: string;
  customizations?: Record<string, any>; // Initial customizations
}

export interface MergeOptions {
  strategy?: 'auto' | 'manual' | 'local' | 'upstream'; // Conflict resolution strategy
  confirm?: boolean; // Prompt for confirmation
}

export interface MergeResult {
  success: boolean;
  conflicts: MergeConflict[];
  merged: any; // Merged definition
}

export interface MergeConflict {
  path: string; // JSON path to conflict
  base: any;
  local: any;
  upstream: any;
  resolved?: any;
}

export interface DiffResult {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}
