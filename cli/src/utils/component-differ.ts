/**
 * Component Differ Utility
 *
 * Compare two components and detect differences and conflicts.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Difference between components
 */
export interface Difference {
  field: string;
  base: unknown;
  source: unknown;
  type: 'added' | 'removed' | 'modified';
}

/**
 * Component metadata for comparison
 */
export interface ComponentMetadata {
  name?: string;
  type?: string;
  version?: string;
  description?: string;
  author?: string;
  source?: Record<string, unknown>;
  fork?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Compare metadata objects
 */
export function compareMetadata(
  base: ComponentMetadata,
  source: ComponentMetadata
): Difference[] {
  const differences: Difference[] = [];

  // Get all unique keys
  const allKeys = new Set([...Object.keys(base), ...Object.keys(source)]);

  for (const key of allKeys) {
    const baseValue = base[key];
    const sourceValue = source[key];

    if (JSON.stringify(baseValue) !== JSON.stringify(sourceValue)) {
      if (key in base && key in source) {
        // Modified
        differences.push({
          field: key,
          base: baseValue,
          source: sourceValue,
          type: 'modified',
        });
      } else if (key in source && !(key in base)) {
        // Added in source
        differences.push({
          field: key,
          base: undefined,
          source: sourceValue,
          type: 'added',
        });
      } else if (key in base && !(key in source)) {
        // Removed in source
        differences.push({
          field: key,
          base: baseValue,
          source: undefined,
          type: 'removed',
        });
      }
    }
  }

  return differences;
}

/**
 * Compare files in two directories
 */
export async function compareFiles(
  basePath: string,
  sourcePath: string
): Promise<Difference[]> {
  const differences: Difference[] = [];

  try {
    const baseFiles = new Set<string>();
    const sourceFiles = new Set<string>();

    // List files in base directory
    try {
      const baseEntries = await fs.readdir(basePath, { recursive: true });
      for (const entry of baseEntries) {
        const fullPath = path.join(basePath, entry);
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          baseFiles.add(entry);
        }
      }
    } catch (error) {
      // Base directory might not exist
    }

    // List files in source directory
    try {
      const sourceEntries = await fs.readdir(sourcePath, { recursive: true });
      for (const entry of sourceEntries) {
        const fullPath = path.join(sourcePath, entry);
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          sourceFiles.add(entry);
        }
      }
    } catch (error) {
      // Source directory might not exist
    }

    // Get all unique files
    const allFiles = new Set([...baseFiles, ...sourceFiles]);

    for (const file of allFiles) {
      const baseFull = path.join(basePath, file);
      const sourceFull = path.join(sourcePath, file);

      try {
        const baseExists = baseFiles.has(file);
        const sourceExists = sourceFiles.has(file);

        if (baseExists && sourceExists) {
          // Both exist, compare content
          const baseHash = await getFileHash(baseFull);
          const sourceHash = await getFileHash(sourceFull);

          if (baseHash !== sourceHash) {
            differences.push({
              field: file,
              base: baseHash,
              source: sourceHash,
              type: 'modified',
            });
          }
        } else if (sourceExists && !baseExists) {
          // Added in source
          differences.push({
            field: file,
            base: undefined,
            source: await getFileHash(sourceFull),
            type: 'added',
          });
        } else if (baseExists && !sourceExists) {
          // Removed in source
          differences.push({
            field: file,
            base: await getFileHash(baseFull),
            source: undefined,
            type: 'removed',
          });
        }
      } catch (error) {
        // Skip files that can't be compared
      }
    }
  } catch (error) {
    // Return empty array if comparison fails
  }

  return differences;
}

/**
 * Find conflicts in differences
 */
export function findConflicts(diffs: Difference[]): Difference[] {
  // Conflicts are considered:
  // 1. Modified files (both sides changed)
  // 2. Added files with same name (both added differently)
  // 3. Removed files (one side removed, other didn't)
  // 4. Modified metadata (excluding fork/source info)

  return diffs.filter((diff) => {
    // Always consider modified as potential conflict
    if (diff.type === 'modified') {
      return true;
    }

    // Added/removed can be conflicts in certain contexts
    if (diff.type === 'added' || diff.type === 'removed') {
      // Exclude certain fields that are expected to differ
      const excludeFields = ['fork', 'source', 'installed_at', 'updated_at'];
      return !excludeFields.some((field) => diff.field.includes(field));
    }

    return false;
  });
}

/**
 * Generate diff report
 */
export function generateDiffReport(diffs: Difference[]): string {
  if (diffs.length === 0) {
    return 'No differences found';
  }

  const lines: string[] = [];

  for (const diff of diffs) {
    const icon =
      diff.type === 'modified'
        ? '~'
        : diff.type === 'added'
          ? '+'
          : '-';

    lines.push(`${icon} ${diff.field}`);

    if (diff.type === 'modified') {
      lines.push(`  Base:   ${JSON.stringify(diff.base)}`);
      lines.push(`  Source: ${JSON.stringify(diff.source)}`);
    } else if (diff.type === 'added') {
      lines.push(`  Added: ${JSON.stringify(diff.source)}`);
    } else if (diff.type === 'removed') {
      lines.push(`  Removed: ${JSON.stringify(diff.base)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get file hash for comparison
 */
async function getFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return 'error';
  }
}

/**
 * Compare component structures
 */
export async function compareComponentStructure(
  basePath: string,
  sourcePath: string
): Promise<{
  metadata_diff: Difference[];
  file_diff: Difference[];
  conflicts: Difference[];
}> {
  let baseMetadata: ComponentMetadata = {};
  let sourceMetadata: ComponentMetadata = {};

  // Try to load metadata files
  try {
    const baseMetaPath = path.join(basePath, 'metadata.json');
    const baseContent = await fs.readFile(baseMetaPath, 'utf-8');
    baseMetadata = JSON.parse(baseContent);
  } catch (error) {
    // Ignore if metadata doesn't exist
  }

  try {
    const sourceMetaPath = path.join(sourcePath, 'metadata.json');
    const sourceContent = await fs.readFile(sourceMetaPath, 'utf-8');
    sourceMetadata = JSON.parse(sourceContent);
  } catch (error) {
    // Ignore if metadata doesn't exist
  }

  // Compare metadata
  const metadataDiff = compareMetadata(baseMetadata, sourceMetadata);

  // Compare files
  const fileDiff = await compareFiles(basePath, sourcePath);

  // Find conflicts
  const conflicts = findConflicts([...metadataDiff, ...fileDiff]);

  return {
    metadata_diff: metadataDiff,
    file_diff: fileDiff,
    conflicts,
  };
}

/**
 * Detect specific conflict type
 */
export function getConflictType(diff: Difference): string {
  if (diff.field.includes('metadata') || diff.field.endsWith('.json')) {
    return 'metadata';
  } else if (diff.field === 'version' || diff.field === 'name') {
    return 'identity';
  } else {
    return 'content';
  }
}
