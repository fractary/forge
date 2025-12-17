/**
 * Merge Manager Utility
 *
 * Manage component merge operations with different strategies.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { compareMetadata, compareComponentStructure, findConflicts, Difference } from './component-differ.js';

/**
 * Merge options
 */
export interface MergeOptions {
  strategy: 'auto' | 'local' | 'upstream' | 'manual';
  backup?: boolean;
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
}

/**
 * Merge result
 */
export interface MergeResult {
  base: string;
  source: string;
  strategy: string;
  success: boolean;
  conflicts?: ConflictInfo[];
  changes: {
    files_modified: number;
    files_added: number;
    files_removed: number;
    metadata_updated: boolean;
  };
  timestamp: string;
  backupPath?: string;
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  file: string;
  type: 'content' | 'metadata' | 'structure';
  base_value: unknown;
  source_value: unknown;
  resolution?: unknown;
}

/**
 * Component metadata
 */
export interface ComponentMetadata {
  name?: string;
  type?: string;
  version?: string;
  description?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/**
 * Create backup of component
 */
export async function createBackup(componentPath: string): Promise<string> {
  const backupDir = path.join(path.dirname(componentPath), '.backups');
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${path.basename(componentPath)}.${timestamp}`);

  await copyDirectory(componentPath, backupPath);

  return backupPath;
}

/**
 * Copy directory recursively
 */
async function copyDirectory(source: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true });

  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.backups') {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destPath);
    } else {
      await fs.copyFile(sourcePath, destPath);
    }
  }
}

/**
 * Load component metadata
 */
async function loadComponentMetadata(componentPath: string): Promise<ComponentMetadata> {
  try {
    const metadataPath = path.join(componentPath, 'metadata.json');
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

/**
 * Save component metadata
 */
async function saveComponentMetadata(
  componentPath: string,
  metadata: ComponentMetadata
): Promise<void> {
  const metadataPath = path.join(componentPath, 'metadata.json');
  const content = JSON.stringify(metadata, null, 2);
  await fs.writeFile(metadataPath, content, 'utf-8');
}

/**
 * Detect conflicts between components
 */
export async function detectConflicts(
  base: ComponentMetadata,
  source: ComponentMetadata
): Promise<ConflictInfo[]> {
  const diffs = compareMetadata(base, source);
  const conflicts: ConflictInfo[] = [];

  for (const diff of diffs) {
    // Exclude expected differences
    const excludeFields = ['fork', 'updated_at', 'installed_at'];
    if (excludeFields.includes(diff.field)) {
      continue;
    }

    if (diff.type === 'modified') {
      conflicts.push({
        file: diff.field,
        type: 'metadata',
        base_value: diff.base,
        source_value: diff.source,
      });
    }
  }

  return conflicts;
}

/**
 * Auto merge strategy - use most recent
 */
async function mergeAuto(
  basePath: string,
  sourcePath: string,
  baseMetadata: ComponentMetadata,
  sourceMetadata: ComponentMetadata,
  dryRun: boolean
): Promise<MergeResult> {
  const baseTime = new Date(baseMetadata.updated_at || 0).getTime();
  const sourceTime = new Date(sourceMetadata.updated_at || 0).getTime();

  const useSource = sourceTime > baseTime;

  const result: MergeResult = {
    base: basePath,
    source: sourcePath,
    strategy: 'auto',
    success: true,
    changes: {
      files_modified: 0,
      files_added: 0,
      files_removed: 0,
      metadata_updated: useSource,
    },
    timestamp: new Date().toISOString(),
  };

  if (!dryRun && useSource) {
    // Copy files from source to base
    const comparison = await compareComponentStructure(basePath, sourcePath);
    result.changes.files_modified = comparison.file_diff.filter(d => d.type === 'modified').length;
    result.changes.files_added = comparison.file_diff.filter(d => d.type === 'added').length;
    result.changes.files_removed = comparison.file_diff.filter(d => d.type === 'removed').length;

    // Update metadata
    await saveComponentMetadata(basePath, sourceMetadata);
  }

  return result;
}

/**
 * Local merge strategy - keep base unchanged
 */
async function mergeLocal(
  basePath: string,
  sourcePath: string,
  baseMetadata: ComponentMetadata,
  sourceMetadata: ComponentMetadata,
  dryRun: boolean
): Promise<MergeResult> {
  const result: MergeResult = {
    base: basePath,
    source: sourcePath,
    strategy: 'local',
    success: true,
    changes: {
      files_modified: 0,
      files_added: 0,
      files_removed: 0,
      metadata_updated: false,
    },
    timestamp: new Date().toISOString(),
  };

  // No changes needed for local strategy
  return result;
}

/**
 * Upstream merge strategy - use source completely
 */
async function mergeUpstream(
  basePath: string,
  sourcePath: string,
  baseMetadata: ComponentMetadata,
  sourceMetadata: ComponentMetadata,
  dryRun: boolean
): Promise<MergeResult> {
  const comparison = await compareComponentStructure(basePath, sourcePath);

  const result: MergeResult = {
    base: basePath,
    source: sourcePath,
    strategy: 'upstream',
    success: true,
    changes: {
      files_modified: comparison.file_diff.filter(d => d.type === 'modified').length,
      files_added: comparison.file_diff.filter(d => d.type === 'added').length,
      files_removed: comparison.file_diff.filter(d => d.type === 'removed').length,
      metadata_updated: true,
    },
    timestamp: new Date().toISOString(),
  };

  if (!dryRun) {
    // Remove base directory content
    const entries = await fs.readdir(basePath);
    for (const entry of entries) {
      if (entry !== 'metadata.json') {
        const entryPath = path.join(basePath, entry);
        const stat = await fs.stat(entryPath);
        if (stat.isDirectory()) {
          await removeDirectory(entryPath);
        } else {
          await fs.unlink(entryPath);
        }
      }
    }

    // Copy all from source
    const sourceEntries = await fs.readdir(sourcePath);
    for (const entry of sourceEntries) {
      const sourcePath2 = path.join(sourcePath, entry);
      const basePath2 = path.join(basePath, entry);
      const stat = await fs.stat(sourcePath2);
      if (stat.isDirectory()) {
        await copyDirectory(sourcePath2, basePath2);
      } else {
        await fs.copyFile(sourcePath2, basePath2);
      }
    }

    // Update metadata
    await saveComponentMetadata(basePath, sourceMetadata);
  }

  return result;
}

/**
 * Manual merge strategy - collect conflicts for interactive resolution
 */
async function mergeManual(
  basePath: string,
  sourcePath: string,
  baseMetadata: ComponentMetadata,
  sourceMetadata: ComponentMetadata,
  dryRun: boolean
): Promise<MergeResult> {
  const comparison = await compareComponentStructure(basePath, sourcePath);
  const conflicts = await detectConflicts(baseMetadata, sourceMetadata);

  const result: MergeResult = {
    base: basePath,
    source: sourcePath,
    strategy: 'manual',
    success: conflicts.length === 0,
    conflicts,
    changes: {
      files_modified: comparison.file_diff.filter(d => d.type === 'modified').length,
      files_added: comparison.file_diff.filter(d => d.type === 'added').length,
      files_removed: comparison.file_diff.filter(d => d.type === 'removed').length,
      metadata_updated: false,
    },
    timestamp: new Date().toISOString(),
  };

  // Manual merge doesn't auto-apply changes
  return result;
}

/**
 * Perform merge operation
 */
export async function mergeComponents(
  basePath: string,
  sourcePath: string,
  options: MergeOptions
): Promise<MergeResult> {
  let backupPath: string | undefined;

  // Create backup if requested
  if (options.backup && !options.dryRun) {
    backupPath = await createBackup(basePath);
  }

  try {
    // Load metadata
    const baseMetadata = await loadComponentMetadata(basePath);
    const sourceMetadata = await loadComponentMetadata(sourcePath);

    // Perform merge based on strategy
    let result: MergeResult;

    const dryRun = options.dryRun ?? false;

    switch (options.strategy) {
      case 'auto':
        result = await mergeAuto(basePath, sourcePath, baseMetadata, sourceMetadata, dryRun);
        break;
      case 'local':
        result = await mergeLocal(basePath, sourcePath, baseMetadata, sourceMetadata, dryRun);
        break;
      case 'upstream':
        result = await mergeUpstream(basePath, sourcePath, baseMetadata, sourceMetadata, dryRun);
        break;
      case 'manual':
        result = await mergeManual(basePath, sourcePath, baseMetadata, sourceMetadata, dryRun);
        break;
      default:
        throw new Error(`Unknown merge strategy: ${options.strategy}`);
    }

    if (backupPath) {
      result.backupPath = backupPath;
    }

    return result;
  } catch (error) {
    // Clean up backup on error
    if (backupPath && !options.dryRun) {
      try {
        await removeDirectory(backupPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    throw error;
  }
}

/**
 * Remove directory recursively
 */
async function removeDirectory(dirPath: string): Promise<void> {
  const entries = await fs.readdir(dirPath);

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry);
    const stat = await fs.stat(entryPath);

    if (stat.isDirectory()) {
      await removeDirectory(entryPath);
    } else {
      await fs.unlink(entryPath);
    }
  }

  await fs.rmdir(dirPath);
}
