/**
 * Fork Manager Utility
 *
 * Manage component forking operations.
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Fork options
 */
export interface ForkOptions {
  destination?: string;
  name?: string;
  description?: string;
  updateMetadata?: boolean;
  withGit?: boolean;
  verbose?: boolean;
}

/**
 * Fork result
 */
export interface ForkResult {
  originalName: string;
  forkedName: string;
  location: string;
  timestamp: string;
  source: {
    registry?: string;
    component: string;
    version: string;
  };
}

/**
 * Component location
 */
export interface ComponentLocation {
  path: string;
  source: 'installed' | 'registry';
  name: string;
  version?: string;
}

/**
 * Component metadata for fork tracking
 */
export interface ComponentMetadata {
  name?: string;
  type?: string;
  version?: string;
  description?: string;
  author?: string;
  source?: {
    registry?: string;
    component?: string;
    version?: string;
  };
  fork?: {
    created_at: string;
    from_registry?: string;
    from_name: string;
    from_version: string;
  };
  [key: string]: unknown;
}

/**
 * Generate unique fork name
 */
export async function generateForkName(
  originalName: string,
  basePath: string
): Promise<string> {
  let counter = 1;
  let newName = `${originalName}-${counter}`;

  // Check if name already exists
  while (true) {
    const fullPath = path.join(basePath, newName);

    try {
      await fs.stat(fullPath);
      // Path exists, increment counter
      counter++;
      newName = `${originalName}-${counter}`;
    } catch (error) {
      // Path doesn't exist, use this name
      break;
    }
  }

  return newName;
}

/**
 * Copy component directory recursively
 */
export async function copyComponentDirectory(
  source: string,
  destination: string
): Promise<void> {
  // Create destination directory
  await fs.mkdir(destination, { recursive: true });

  // Read source directory
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    // Skip node_modules and .git
    if (entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyComponentDirectory(sourcePath, destPath);
    } else {
      await fs.copyFile(sourcePath, destPath);
    }
  }
}

/**
 * Load component metadata
 */
export async function loadComponentMetadata(componentPath: string): Promise<ComponentMetadata> {
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
export async function saveComponentMetadata(
  componentPath: string,
  metadata: ComponentMetadata
): Promise<void> {
  const metadataPath = path.join(componentPath, 'metadata.json');
  const content = JSON.stringify(metadata, null, 2);
  await fs.writeFile(metadataPath, content, 'utf-8');
}

/**
 * Update component metadata with fork information
 */
export async function updateForkMetadata(
  componentPath: string,
  originalName: string,
  originalVersion: string,
  fromRegistry?: string
): Promise<void> {
  const metadata = await loadComponentMetadata(componentPath);

  metadata.fork = {
    created_at: new Date().toISOString(),
    from_registry: fromRegistry,
    from_name: originalName,
    from_version: originalVersion,
  };

  await saveComponentMetadata(componentPath, metadata);
}

/**
 * Create fork of a component
 */
export async function createFork(
  sourcePath: string,
  sourceMetadata: ComponentMetadata,
  options: ForkOptions
): Promise<ForkResult> {
  const basePath = options.destination || process.cwd();
  const forkName = options.name || (await generateForkName(sourceMetadata.name || 'fork', basePath));

  // Create destination path
  const destinationPath = path.join(basePath, forkName);

  // Copy component
  await copyComponentDirectory(sourcePath, destinationPath);

  // Update metadata
  if (options.updateMetadata || options.description) {
    const metadata = await loadComponentMetadata(destinationPath);

    // Update name
    metadata.name = forkName;

    // Update description if provided
    if (options.description) {
      metadata.description = options.description;
    }

    // Add fork tracking
    metadata.fork = {
      created_at: new Date().toISOString(),
      from_registry: sourceMetadata.source?.registry,
      from_name: sourceMetadata.name || 'unknown',
      from_version: sourceMetadata.version || 'unknown',
    };

    // Remove source information (this is now a local component)
    if (metadata.source) {
      delete metadata.source;
    }

    await saveComponentMetadata(destinationPath, metadata);
  } else {
    // Minimal metadata update - just add fork tracking
    await updateForkMetadata(
      destinationPath,
      sourceMetadata.name || 'unknown',
      sourceMetadata.version || 'unknown',
      sourceMetadata.source?.registry
    );
  }

  return {
    originalName: sourceMetadata.name || 'unknown',
    forkedName: forkName,
    location: destinationPath,
    timestamp: new Date().toISOString(),
    source: {
      registry: sourceMetadata.source?.registry,
      component: sourceMetadata.name || 'unknown',
      version: sourceMetadata.version || 'unknown',
    },
  };
}

/**
 * Validate fork name
 */
export function isValidForkName(name: string): boolean {
  // Same rules as registry name
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Get fork lineage
 */
export async function getForkLineage(componentPath: string): Promise<string[]> {
  const lineage: string[] = [];

  let current = await loadComponentMetadata(componentPath);
  lineage.push(current.name || 'unknown');

  // Trace back through forks
  while (current.fork) {
    lineage.unshift(current.fork.from_name);
    // Note: In a real implementation, we'd load the original component
    // For now, we just collect the names
    break;
  }

  return lineage;
}

/**
 * Check if component is a fork
 */
export async function isFork(componentPath: string): Promise<boolean> {
  const metadata = await loadComponentMetadata(componentPath);
  return !!(metadata.fork && metadata.fork.from_name);
}

/**
 * Get fork information
 */
export async function getForkInfo(componentPath: string): Promise<ComponentMetadata['fork'] | null> {
  const metadata = await loadComponentMetadata(componentPath);
  return metadata.fork || null;
}
