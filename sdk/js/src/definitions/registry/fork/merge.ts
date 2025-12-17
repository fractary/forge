/**
 * Three-way merge logic for fork updates
 */

import { logger } from '../../../logger';
import type { MergeResult, MergeConflict } from './types';
import { getAllPaths, getValueAtPath, setValueAtPath } from './diff';

interface MergeInput {
  base: any; // Original fork point
  local: any; // Current local version
  upstream: any; // Latest upstream version
}

/**
 * Perform three-way merge
 *
 * Strategy:
 * - If only upstream changed: take upstream
 * - If only local changed: keep local
 * - If both changed to same value: take either (no conflict)
 * - If both changed to different values: conflict!
 */
export async function performMerge(input: MergeInput): Promise<MergeResult> {
  const { base, local, upstream } = input;

  const result: MergeResult = {
    success: true,
    conflicts: [],
    merged: JSON.parse(JSON.stringify(local)), // Start with local copy
  };

  // Get all paths from all three versions
  const allPaths = new Set([...getAllPaths(base), ...getAllPaths(local), ...getAllPaths(upstream)]);

  for (const path of Array.from(allPaths)) {
    const baseValue = getValueAtPath(base, path);
    const localValue = getValueAtPath(local, path);
    const upstreamValue = getValueAtPath(upstream, path);

    const localChanged = !isEqual(baseValue, localValue);
    const upstreamChanged = !isEqual(baseValue, upstreamValue);

    if (!localChanged && !upstreamChanged) {
      // No change - keep as is
      continue;
    }

    if (!localChanged && upstreamChanged) {
      // Only upstream changed - take upstream
      setValueAtPath(result.merged, path, upstreamValue);
      logger.debug(`Auto-merge ${path}: upstream change applied`);
      continue;
    }

    if (localChanged && !upstreamChanged) {
      // Only local changed - keep local (already in merged)
      logger.debug(`Auto-merge ${path}: local change kept`);
      continue;
    }

    // Both changed
    if (isEqual(localValue, upstreamValue)) {
      // Both changed to same value - no conflict
      logger.debug(`Auto-merge ${path}: both changed to same value`);
      continue;
    }

    // Conflict: both changed to different values
    result.success = false;
    result.conflicts.push({
      path,
      base: baseValue,
      local: localValue,
      upstream: upstreamValue,
    });
    logger.warn(
      `Conflict at ${path}: local=${JSON.stringify(localValue)}, upstream=${JSON.stringify(upstreamValue)}`
    );
  }

  if (result.conflicts.length > 0) {
    logger.error(`Merge completed with ${result.conflicts.length} conflict(s)`);
  } else {
    logger.success('Merge completed successfully with no conflicts');
  }

  return result;
}

/**
 * Resolve conflicts interactively or with strategy
 */
export function resolveConflicts(
  result: MergeResult,
  strategy: 'local' | 'upstream' | 'manual' = 'manual'
): MergeResult {
  if (strategy === 'manual') {
    // Return conflicts for manual resolution
    return result;
  }

  // Auto-resolve based on strategy
  for (const conflict of result.conflicts) {
    const resolution = strategy === 'local' ? conflict.local : conflict.upstream;
    setValueAtPath(result.merged, conflict.path, resolution);
    conflict.resolved = resolution;
  }

  result.success = true;
  logger.info(`Auto-resolved ${result.conflicts.length} conflict(s) using ${strategy} strategy`);

  return result;
}

/**
 * Deep equality check
 */
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => isEqual(item, b[index]));
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => bKeys.includes(key) && isEqual(a[key], b[key]));
}
