/**
 * Fork module exports
 */

export { ForkManager } from './fork-manager';
export { performMerge, resolveConflicts } from './merge';
export { diff, getAllPaths, getValueAtPath, setValueAtPath } from './diff';

export type {
  ForkMetadata,
  ForkOptions,
  MergeOptions,
  MergeResult,
  MergeConflict,
  DiffResult,
} from './types';
