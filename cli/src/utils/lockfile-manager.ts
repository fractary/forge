/**
 * Lockfile Manager
 *
 * Manages `.fractary/plugins/forge/lock.json` files for tracking
 * exact versions and checksums of installed components.
 *
 * Enables reproducible installations across machines and CI/CD.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { getForgeDir } from './forge-config.js';

type ComponentType = 'agent' | 'tool' | 'workflow' | 'template' | 'plugin';

interface LocalComponent {
  name: string;
  type: ComponentType;
  version?: string;
  source: string;
  path?: string;
  plugin?: string;
  isProject?: boolean;
}

/**
 * Single locked component entry
 */
export interface LockEntry {
  name: string;
  version: string;
  checksum?: string;
  installed_path: string;
  plugin?: string;
  installed_at: string;
}

/**
 * Complete lockfile structure
 */
export interface LockFile {
  version: string;
  timestamp: string;
  created_by: string;
  lockfile_version: string;
  locked: {
    agents: LockEntry[];
    tools: LockEntry[];
    workflows: LockEntry[];
    templates: LockEntry[];
  };
}

/**
 * Get path to local lockfile
 */
export async function getLocalLockfilePath(
  cwd: string = process.cwd()
): Promise<string> {
  const forgeDir = await getForgeDir(cwd);
  return path.join(forgeDir, 'lock.json');
}

/**
 * Get path to global lockfile
 */
export function getGlobalLockfilePath(): string {
  const os = require('os');
  return path.join(os.homedir(), '.fractary', 'registry', 'lock.json');
}

/**
 * Create empty lockfile structure
 */
function createEmptyLockFile(): LockFile {
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    created_by: 'fractary-cli',
    lockfile_version: '1.0.0',
    locked: {
      agents: [],
      tools: [],
      workflows: [],
      templates: [],
    },
  };
}

/**
 * Generate lockfile from current installed components
 */
export async function generateLockfile(
  cwd: string = process.cwd(),
  options: { update?: boolean } = {}
): Promise<LockFile> {
  // Lazy-load SDK to avoid CommonJS/ESM interop issues
  const { Registry } = await import('@fractary/forge');

  const lockFile = createEmptyLockFile();

  // Define component types
  const types: ComponentType[] = ['agent', 'tool', 'workflow', 'template'];

  // Collect components from project registry
  try {
    for (const type of types) {
      const components = await Registry.localResolver.listProject(type);

      for (const comp of components) {
        const entry: LockEntry = {
          name: comp.name,
          version: (comp as any).version || 'unknown',
          installed_path: comp.path || '',
          plugin: (comp as any).plugin,
          installed_at: new Date().toISOString(),
        };

        // Add to appropriate section
        const plural = type === 'agent' ? 'agents' :
                      type === 'tool' ? 'tools' :
                      type === 'workflow' ? 'workflows' : 'templates';
        lockFile.locked[plural as keyof typeof lockFile.locked].push(entry);
      }
    }
  } catch (error) {
    // If listing fails, return empty lockfile
    console.warn(`Warning: Could not read components: ${(error as Error).message}`);
  }

  return lockFile;
}

/**
 * Load lockfile from disk
 */
export async function loadLockfile(lockfilePath: string): Promise<LockFile | null> {
  try {
    if (!await fs.pathExists(lockfilePath)) {
      return null;
    }

    const content = await fs.readJson(lockfilePath);
    return validateLockfileStructure(content) ? content : null;
  } catch (error) {
    console.warn(`Warning: Could not load lockfile: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Save lockfile to disk
 */
export async function saveLockfile(
  lockFile: LockFile,
  lockfilePath: string
): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(lockfilePath);
  await fs.ensureDir(dir);

  // Update timestamp
  lockFile.timestamp = new Date().toISOString();

  // Write file
  await fs.writeJson(lockfilePath, lockFile, { spaces: 2 });
}

/**
 * Validate lockfile structure
 */
export function validateLockfileStructure(data: unknown): data is LockFile {
  if (!data || typeof data !== 'object') return false;

  const lock = data as Record<string, unknown>;

  // Check required fields
  if (typeof lock.version !== 'string') return false;
  if (typeof lock.timestamp !== 'string') return false;
  if (!lock.locked || typeof lock.locked !== 'object') return false;

  const locked = lock.locked as Record<string, unknown>;

  // Check component types
  for (const type of ['agents', 'tools', 'workflows', 'templates']) {
    if (!Array.isArray(locked[type])) return false;
  }

  return true;
}

/**
 * Get summary of locked components
 */
export function summarizeLockfile(lock: LockFile): {
  totalComponents: number;
  agents: number;
  tools: number;
  workflows: number;
  templates: number;
} {
  return {
    totalComponents:
      lock.locked.agents.length +
      lock.locked.tools.length +
      lock.locked.workflows.length +
      lock.locked.templates.length,
    agents: lock.locked.agents.length,
    tools: lock.locked.tools.length,
    workflows: lock.locked.workflows.length,
    templates: lock.locked.templates.length,
  };
}

/**
 * Check if component is in lockfile
 */
export function isComponentLocked(
  lock: LockFile,
  name: string,
  type: ComponentType
): boolean {
  const plural = type === 'agent' ? 'agents' :
                type === 'tool' ? 'tools' :
                type === 'workflow' ? 'workflows' : 'templates';

  return lock.locked[plural as keyof typeof lock.locked].some(
    (entry) => entry.name === name
  );
}

/**
 * Find locked entry by name and type
 */
export function findLockedEntry(
  lock: LockFile,
  name: string,
  type: ComponentType
): LockEntry | undefined {
  const plural = type === 'agent' ? 'agents' :
                type === 'tool' ? 'tools' :
                type === 'workflow' ? 'workflows' : 'templates';

  return lock.locked[plural as keyof typeof lock.locked].find(
    (entry) => entry.name === name
  );
}

/**
 * Merge component into lockfile
 */
export function mergeLockEntry(
  lock: LockFile,
  component: LocalComponent
): LockFile {
  const type = component.type as ComponentType;
  const plural = type === 'agent' ? 'agents' :
                type === 'tool' ? 'tools' :
                type === 'workflow' ? 'workflows' : 'templates';

  const entry: LockEntry = {
    name: component.name,
    version: component.version || 'unknown',
    installed_path: component.path || '',
    plugin: component.plugin,
    installed_at: new Date().toISOString(),
  };

  // Remove existing entry if present
  const list = lock.locked[plural as keyof typeof lock.locked];
  const index = list.findIndex((e) => e.name === component.name);

  if (index !== -1) {
    list.splice(index, 1);
  }

  // Add new entry
  list.push(entry);

  return lock;
}

/**
 * Remove component from lockfile
 */
export function removeLockEntry(
  lock: LockFile,
  name: string,
  type: ComponentType
): LockFile {
  const plural = type === 'agent' ? 'agents' :
                type === 'tool' ? 'tools' :
                type === 'workflow' ? 'workflows' : 'templates';

  const list = lock.locked[plural as keyof typeof lock.locked];
  const index = list.findIndex((e) => e.name === name);

  if (index !== -1) {
    list.splice(index, 1);
  }

  return lock;
}
